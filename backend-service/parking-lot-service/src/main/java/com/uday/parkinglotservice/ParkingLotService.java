package com.uday.parkinglotservice;

import com.uday.parkinglotservice.DTO.*;
import com.uday.parkinglotservice.Entity.ParkingLevel;
import com.uday.parkinglotservice.Entity.ParkingSpot;
import com.uday.parkinglotservice.Repository.ParkingLevelRepository;
import com.uday.parkinglotservice.Repository.ParkingSpotRepository;
import com.uday.parkinglotservice.exception.DuplicateLevelException;
import com.uday.parkinglotservice.exception.DuplicateSpotException;
import com.uday.parkinglotservice.exception.InvalidRequestException;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.web.reactive.function.client.WebClientRequestException;

import javax.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ParkingLotService {

    @Autowired
    private WebClient loadBalancedWebClient;

    private final ParkingLevelRepository levelRepo;
    private final ParkingSpotRepository spotRepo;

    @Autowired
    public ParkingLotService(ParkingLevelRepository levelRepo, ParkingSpotRepository spotRepo) {
        this.levelRepo = levelRepo;
        this.spotRepo = spotRepo;
    }

    /**
     * Get all parking levels - cached for 5 minutes
     * Returns DTOs to avoid lazy loading issues with caching
     */
    @Cacheable(value = "parkingLevels", key = "'all'")
    @Transactional(readOnly = true)
    public List<LevelResponse> getAllLevels() {
        System.out.println("Fetching all levels from database (cache miss)");
        return levelRepo.findAll().stream()
                .map(this::mapToLevelResponseSimple)
                .collect(Collectors.toList());
    }

    /**
     * Map ParkingLevel entity to LevelResponse DTO (without spots details)
     * Used for listing levels to avoid lazy loading issues
     */
    private LevelResponse mapToLevelResponseSimple(ParkingLevel level) {
        long totalSpots = spotRepo.countByLevelId(level.getId());
        long availableSpots = spotRepo.countByLevelIdAndStatus(level.getId(), ParkingSpot.SpotStatus.AVAILABLE);
        long occupiedSpots = spotRepo.countByLevelIdAndStatus(level.getId(), ParkingSpot.SpotStatus.OCCUPIED);

        return LevelResponse.builder()
                .id(level.getId())
                .levelNumber(level.getLevelNumber())
                .name(level.getName())
                .totalSpots((int) totalSpots)
                .availableSpots((int) availableSpots)
                .occupiedSpots((int) occupiedSpots)
                .build();
    }

    /**
     * Get all levels with response DTOs containing spot counts - cached for 2 minutes
     */
    @Cacheable(value = "parkingLevelsDetails", key = "'details'")
    @Transactional(readOnly = true)
    public List<LevelResponse> getAllLevelsWithDetails() {
        System.out.println("Fetching all levels with details from database (cache miss)");
        return levelRepo.findAll().stream()
                .map(this::mapToLevelResponse)
                .collect(Collectors.toList());
    }

    /**
     * Legacy method - kept for backward compatibility
     */
    public ParkingLevel addLevel(ParkingLevel level) {
        if (level.getSpots() != null) {
            level.getSpots().forEach(spot -> spot.setLevel(level));
        }
        return levelRepo.save(level);
    }

    /**
     * Create a new parking level with spots - TRANSACTIONAL
     * This is atomic - if spot creation fails, level creation rolls back
     * Evicts parking caches on success
     */
    @Transactional(rollbackFor = Exception.class)
    @Caching(evict = {
        @CacheEvict(value = "parkingLevels", allEntries = true),
        @CacheEvict(value = "parkingLevelsDetails", allEntries = true),
        @CacheEvict(value = "parkingStats", allEntries = true)
    })
    public LevelResponse createLevelWithSpots(LevelRequest request) {
        System.out.println("Creating level (caches will be evicted)");
        // 1. Validate request
        validateLevelRequest(request);

        // 2. Check for duplicate level number
        if (levelRepo.existsByLevelNumber(request.getLevelNumber())) {
            throw new DuplicateLevelException("Level with number '" + request.getLevelNumber() + "' already exists");
        }

        // 3. Create the level entity
        ParkingLevel level = new ParkingLevel();
        level.setLevelNumber(request.getLevelNumber());
        level.setName(request.getName() != null ? request.getName() : request.getLevelNumber());
        level.setTotalSpots(request.getTotalSpots());

        // 4. Create spots
        List<ParkingSpot> spots = createSpots(request, level);

        // 5. Validate spot codes for duplicates within the request
        validateSpotCodes(spots);

        // 6. Add spots to level (cascade will save them)
        spots.forEach(level::addSpot);

        // 7. Save level (spots are saved via cascade)
        ParkingLevel savedLevel = levelRepo.save(level);

        // 8. Return response
        return mapToLevelResponse(savedLevel);
    }

    /**
     * Validate the level request
     */
    private void validateLevelRequest(LevelRequest request) {
        if (request.getLevelNumber() == null || request.getLevelNumber().trim().isEmpty()) {
            throw new InvalidRequestException("Level number is required");
        }
        if (request.getTotalSpots() <= 0) {
            throw new InvalidRequestException("Total spots must be greater than 0");
        }
        if (request.getTotalSpots() > 1000) {
            throw new InvalidRequestException("Total spots cannot exceed 1000 per level");
        }

        // If custom spots provided, validate count matches totalSpots
        if (request.getSpots() != null && !request.getSpots().isEmpty()) {
            if (request.getSpots().size() != request.getTotalSpots()) {
                throw new InvalidRequestException("Number of custom spots (" + request.getSpots().size() +
                    ") must match totalSpots (" + request.getTotalSpots() + ")");
            }
        }

        // If spot distribution provided, validate it sums to totalSpots
        int distributionSum = request.getCarSpots() + request.getBikeSpots() +
                              request.getEvSpots() + request.getHandicappedSpots();
        if (distributionSum > 0 && distributionSum != request.getTotalSpots()) {
            throw new InvalidRequestException("Spot distribution sum (" + distributionSum +
                ") must equal totalSpots (" + request.getTotalSpots() + ")");
        }
    }

    /**
     * Create spots based on request - either custom or auto-generated
     */
    private List<ParkingSpot> createSpots(LevelRequest request, ParkingLevel level) {
        List<ParkingSpot> spots = new ArrayList<>();

        if (request.getSpots() != null && !request.getSpots().isEmpty()) {
            // Use custom spot configurations
            for (int i = 0; i < request.getSpots().size(); i++) {
                SpotRequest spotReq = request.getSpots().get(i);
                ParkingSpot spot = new ParkingSpot();
                spot.setSpotCode(spotReq.getSpotCode() != null ? spotReq.getSpotCode() : generateSpotCode(i + 1));
                spot.setSpotType(spotReq.getSpotType() != null ? spotReq.getSpotType().toUpperCase() : "CAR");
                spot.setDisabled(spotReq.isDisabled());
                spot.setOccupied(false);
                spots.add(spot);
            }
        } else {
            // Auto-generate spots based on distribution or default to all CAR
            spots = autoGenerateSpots(request);
        }

        return spots;
    }

    /**
     * Auto-generate spots with proper codes and types
     */
    private List<ParkingSpot> autoGenerateSpots(LevelRequest request) {
        List<ParkingSpot> spots = new ArrayList<>();
        int spotIndex = 1;

        // If distribution is specified, use it
        if (request.getCarSpots() > 0 || request.getBikeSpots() > 0 ||
            request.getEvSpots() > 0 || request.getHandicappedSpots() > 0) {

            // Create CAR spots
            for (int i = 0; i < request.getCarSpots(); i++) {
                spots.add(createAutoSpot(spotIndex++, "CAR", false));
            }
            // Create BIKE spots
            for (int i = 0; i < request.getBikeSpots(); i++) {
                spots.add(createAutoSpot(spotIndex++, "BIKE", false));
            }
            // Create EV spots
            for (int i = 0; i < request.getEvSpots(); i++) {
                spots.add(createAutoSpot(spotIndex++, "EV", false));
            }
            // Create HANDICAPPED spots
            for (int i = 0; i < request.getHandicappedSpots(); i++) {
                spots.add(createAutoSpot(spotIndex++, "HANDICAPPED", true));
            }
        } else {
            // Default: all CAR spots
            for (int i = 0; i < request.getTotalSpots(); i++) {
                spots.add(createAutoSpot(spotIndex++, "CAR", false));
            }
        }

        return spots;
    }

    /**
     * Create a single auto-generated spot
     */
    private ParkingSpot createAutoSpot(int index, String type, boolean isDisabled) {
        ParkingSpot spot = new ParkingSpot();
        spot.setSpotCode(generateSpotCode(index));
        spot.setSpotType(type);
        spot.setDisabled(isDisabled);
        spot.setOccupied(false);
        return spot;
    }

    /**
     * Generate spot code like A1, A2, ... A26, B1, B2, etc.
     */
    private String generateSpotCode(int index) {
        int letterIndex = (index - 1) / 26;
        int numberIndex = ((index - 1) % 26) + 1;
        char letter = (char) ('A' + letterIndex);
        return String.valueOf(letter) + numberIndex;
    }

    /**
     * Validate that all spot codes are unique within the level
     */
    private void validateSpotCodes(List<ParkingSpot> spots) {
        Set<String> seenCodes = new HashSet<>();
        for (ParkingSpot spot : spots) {
            if (!seenCodes.add(spot.getSpotCode().toUpperCase())) {
                throw new DuplicateSpotException("Duplicate spot code: " + spot.getSpotCode());
            }
        }
    }

    /**
     * Map ParkingLevel entity to LevelResponse DTO
     */
    private LevelResponse mapToLevelResponse(ParkingLevel level) {
        Map<String, Integer> spotsByType = new HashMap<>();
        List<SpotResponse> spotResponses = new ArrayList<>();

        if (level.getSpots() != null) {
            for (ParkingSpot spot : level.getSpots()) {
                // Count by type
                spotsByType.merge(spot.getSpotType(), 1, Integer::sum);

                // Map to response
                spotResponses.add(SpotResponse.builder()
                        .id(spot.getId())
                        .spotCode(spot.getSpotCode())
                        .spotType(spot.getSpotType())
                        .isDisabled(spot.isDisabled())
                        .isOccupied(spot.isOccupied())
                        .levelId(level.getId())
                        .build());
            }
        }

        int totalSpots = level.getSpots() != null ? level.getSpots().size() : 0;
        int occupiedSpots = (int) level.getSpots().stream().filter(ParkingSpot::isOccupied).count();

        return LevelResponse.builder()
                .id(level.getId())
                .levelNumber(level.getLevelNumber())
                .name(level.getName())
                .totalSpots(totalSpots)
                .availableSpots(totalSpots - occupiedSpots)
                .occupiedSpots(occupiedSpots)
                .spotsByType(spotsByType)
                .spots(spotResponses)
                .message("Level created successfully with " + totalSpots + " spots")
                .build();
    }

    /**
     * Add a single spot to an existing level
     * Evicts parking caches on success
     */
    @Transactional(rollbackFor = Exception.class)
    @Caching(evict = {
        @CacheEvict(value = "parkingLevelsDetails", allEntries = true),
        @CacheEvict(value = "parkingStats", allEntries = true)
    })
    public SpotResponse addSpotToLevel(Long levelId, SpotRequest spotRequest) {
        System.out.println("Adding spot to level (caches will be evicted)");
        ParkingLevel level = levelRepo.findById(levelId)
                .orElseThrow(() -> new InvalidRequestException("Level not found with id: " + levelId));

        // Check for duplicate spot code
        if (spotRepo.existsBySpotCodeAndLevelId(spotRequest.getSpotCode(), levelId)) {
            throw new DuplicateSpotException("Spot code '" + spotRequest.getSpotCode() + "' already exists in this level");
        }

        ParkingSpot spot = new ParkingSpot();
        spot.setSpotCode(spotRequest.getSpotCode());
        spot.setSpotType(spotRequest.getSpotType() != null ? spotRequest.getSpotType().toUpperCase() : "CAR");
        spot.setDisabled(spotRequest.isDisabled());
        spot.setOccupied(false);
        spot.setLevel(level);

        ParkingSpot savedSpot = spotRepo.save(spot);

        // Update level's total spots count
        level.setTotalSpots(level.getTotalSpots() + 1);
        levelRepo.save(level);

        return SpotResponse.builder()
                .id(savedSpot.getId())
                .spotCode(savedSpot.getSpotCode())
                .spotType(savedSpot.getSpotType())
                .isDisabled(savedSpot.isDisabled())
                .isOccupied(savedSpot.isOccupied())
                .levelId(levelId)
                .build();
    }

    public List<ParkingSpot> getAvailableSpots(Long levelId, boolean isDisabled) {
        return spotRepo.findByLevelIdAndIsOccupiedFalseAndIsDisabled(levelId, isDisabled);
    }

    /**
     * Get all spots for a level (available and occupied)
     */
    public List<SpotResponse> getAllSpotsByLevel(Long levelId) {
        return spotRepo.findByLevelId(levelId).stream()
                .map(spot -> SpotResponse.builder()
                        .id(spot.getId())
                        .spotCode(spot.getSpotCode())
                        .spotType(spot.getSpotType())
                        .isDisabled(spot.isDisabled())
                        .isOccupied(spot.isOccupied())
                        .levelId(levelId)
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public ParkingSpot allocateSpot(Long levelId, boolean isDisabled) {
        List<ParkingSpot> spots = spotRepo.findAvailableSpotsForUpdate(levelId, isDisabled);
        System.out.println(spots);
        if (spots.isEmpty()) {
            System.out.println("Parking Spots : " + spots);
            throw new IllegalStateException("No parking spots are available");
        }

        ParkingSpot spot = spots.get(0);
        spot.setOccupied(true);

        return spotRepo.save(spot);
    }

    @Transactional
    public void releaseSpot(Long spotId) {
        ParkingSpot spot = spotRepo.findSpotForUpdate(spotId);

        if (!spot.isOccupied()) {
            throw new IllegalStateException("Spot is already free");
        }

        spot.setOccupied(false);
        spotRepo.save(spot);
    }

    /**
     * Occupy a specific spot by ID with pessimistic locking.
     * Used by ticketing-service to atomically reserve a spot when creating a user ticket.
     * @param spotId the spot to occupy
     * @return SpotResponse with updated spot details
     * @throws IllegalStateException if spot is not available
     */
    @Transactional
    public SpotResponse occupySpot(Long spotId) {
        ParkingSpot spot = spotRepo.findSpotForUpdate(spotId);

        if (spot == null) {
            throw new InvalidRequestException("Spot not found with id: " + spotId);
        }

        if (spot.getStatus() == ParkingSpot.SpotStatus.OCCUPIED || spot.isOccupied()) {
            throw new IllegalStateException("Spot is already occupied");
        }

        // Check if spot is out of service (DISABLED status), not handicapped (isDisabled boolean)
        if (spot.getStatus() == ParkingSpot.SpotStatus.DISABLED) {
            throw new IllegalStateException("Cannot occupy a disabled spot - spot is out of service");
        }

        // Use the entity's occupy() method which properly sets both status and isOccupied
        spot.occupy();
        ParkingSpot saved = spotRepo.save(spot);

        return SpotResponse.builder()
                .id(saved.getId())
                .spotCode(saved.getSpotCode())
                .spotType(saved.getSpotType())
                .isDisabled(saved.isDisabled())
                .isOccupied(saved.isOccupied())
                .levelId(saved.getLevel().getId())
                .build();
    }

    // Ticket Response
    @Transactional
    public TicketDetails allocateSpotAndCreateTicket(
            Long levelId,
            boolean isDisabled,
            String vehicleNumber
    ) {
        System.out.println("Trying to acquire DB lock");
        ParkingSpot spot = allocateSpot(levelId, isDisabled);
        VehicleResponse vehicle = registerOrFetchVehicle(vehicleNumber, isDisabled);
        System.out.println("Parking spot reserved");
        return createTicket(spot.getId(), vehicleNumber);
    }

    @PostConstruct
    public void verifyWebClient() {
        System.out.println("Injected WebClient class = " + loadBalancedWebClient.getClass());
    }

    //Vehicle Service
    @CircuitBreaker(name = "vehicleService", fallbackMethod = "vehicleFallback")
    @Retry(name = "vehicleService")
    public VehicleResponse registerOrFetchVehicle(
            String vehicleNumber,
            boolean isDisabled
    ) {
        System.out.println("Calling Vehicle service");
        VehicleRequest request = new VehicleRequest();
        request.setLicensePlate(vehicleNumber);
        request.setDisabled(isDisabled);
        request.setType("CAR"); // or derive later

        return loadBalancedWebClient.post()
                .uri("http://VEHICLE-SERVICE:8081/vehicle/save")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(VehicleResponse.class)
                .block();
    }

    //Vehicle service fallback
    public VehicleResponse vehicleFallback(
            String vehicleNumber,
            boolean isDisabled,
            Throwable ex
    ) {
        throw new IllegalStateException(
                "Vehicle service unavailable. Cannot register vehicle.", ex
        );
    }

    //Calling Ticketing service
    @CircuitBreaker(name = "ticketingService", fallbackMethod = "ticketFallback")
    @Retry(name = "ticketingService")
    public TicketDetails createTicket(Long spotId, String vehicleNumber) {
        System.out.println("Calling Ticketing service");
        try {
            return loadBalancedWebClient.post()
                    .uri("http://TICKETING-SERVICE:8082/ticketing/create?spotId={spotId}&vehicleNumber={vehicleNumber}", spotId, vehicleNumber)
                    .retrieve()
                    .bodyToMono(TicketDetails.class)
                    .block();
        } catch (WebClientRequestException ex) {
            System.out.println("WebClientRequestException → " + ex.getMessage());
            throw ex;
        }
    }

    public TicketDetails ticketFallback(
            Long spotId,
            String vehicleNumber,
            Throwable ex
    ) {
        throw new IllegalStateException(
                "Ticketing service unavailable. Please try again later.", ex
        );
    }

    //Calculate amount
    private double calculateFee(LocalDateTime entryTime) {
        long hours = ChronoUnit.HOURS.between(entryTime, LocalDateTime.now());
        return Math.max(600, hours * 50); // minimum ₹50
    }

    // Vehicle Exit
    @Transactional
    public void exitVehicle(Long ticketId) {
        try {
            System.out.println("Exit service being called here");

            // 1. Fetch ticket details from ticketing-service
            TicketDetails ticket = loadBalancedWebClient.get()
                    .uri("http://TICKETING-SERVICE:8082/ticketing/{id}", ticketId)
                    .retrieve()
                    .bodyToMono(TicketDetails.class)
                    .block();

            if (ticket == null) {
                throw new IllegalStateException("Ticket not found");
            }

            // 2. Validate ticket state
            if (ticket.getExitTime() != null) {
                throw new IllegalStateException("Ticket already closed");
            }

            // 2. Calculate fee (mock for now)
            double amount = calculateFee(ticket.getEntryTime());

            // 3. Process payment (MUST succeed)
            processPayment(ticketId, amount);

            // 3. Close ticket
            loadBalancedWebClient.put()
                    .uri("http://TICKETING-SERVICE:8082/ticketing/exit/{ticketId}", ticketId)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();

            // 4. Release parking spot using spotId from ticket
            releaseSpot(ticket.getSpotId());
        } catch (WebClientRequestException ex) {
            System.out.println("WebClientRequestException → " + ex.getMessage());
            throw ex;
        }
    }

    @CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
    @Retry(name = "paymentService")
    public void processPayment(Long ticketId, double amount) {
        System.out.println("Calling Payment service");

        PaymentRequest request = new PaymentRequest();
        request.setTicketId(ticketId);
        request.setAmount(amount);

        PaymentResponse response = loadBalancedWebClient.post()
                .uri("http://PAYMENT-SERVICE:8083/payments/create")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(PaymentResponse.class)
                .block();

        if (response == null || !"SUCCESS".equals(response.getStatus())) {
            System.out.println("this is the response : " + response);
            throw new IllegalStateException("Payment failed");
        }
    }

    public void paymentFallback(Long ticketId, double amount, Throwable ex) {
        throw new IllegalStateException(
                "Payment service unavailable. Exit denied.", ex
        );
    }

    // ========== ADMIN SPOT MANAGEMENT ==========

    /**
     * Enable a disabled spot
     * Evicts parking caches on success
     */
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "parkingLevelsDetails", allEntries = true),
        @CacheEvict(value = "parkingStats", allEntries = true)
    })
    public SpotResponse enableSpot(Long spotId) {
        System.out.println("Enabling spot (caches will be evicted)");
        ParkingSpot spot = spotRepo.findById(spotId)
                .orElseThrow(() -> new InvalidRequestException("Spot not found with id: " + spotId));

        spot.enable();
        ParkingSpot saved = spotRepo.save(spot);

        return SpotResponse.builder()
                .id(saved.getId())
                .spotCode(saved.getSpotCode())
                .spotType(saved.getSpotType())
                .isDisabled(saved.isDisabled())
                .isOccupied(saved.isOccupied())
                .levelId(saved.getLevel().getId())
                .build();
    }

    /**
     * Disable a spot
     * Evicts parking caches on success
     */
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "parkingLevelsDetails", allEntries = true),
        @CacheEvict(value = "parkingStats", allEntries = true)
    })
    public SpotResponse disableSpot(Long spotId) {
        System.out.println("Disabling spot (caches will be evicted)");
        ParkingSpot spot = spotRepo.findById(spotId)
                .orElseThrow(() -> new InvalidRequestException("Spot not found with id: " + spotId));

        if (spot.isOccupied()) {
            throw new InvalidRequestException("Cannot disable an occupied spot");
        }

        spot.disable();
        ParkingSpot saved = spotRepo.save(spot);

        return SpotResponse.builder()
                .id(saved.getId())
                .spotCode(saved.getSpotCode())
                .spotType(saved.getSpotType())
                .isDisabled(saved.isDisabled())
                .isOccupied(saved.isOccupied())
                .levelId(saved.getLevel().getId())
                .build();
    }

    // ========== SYSTEM STATS ==========

    /**
     * Get parking system statistics - cached for 1 minute
     */
    @Cacheable(value = "parkingStats", key = "'system'")
    @Transactional(readOnly = true)
    public ParkingStatsResponse getParkingStats() {
        System.out.println("Fetching parking stats from database (cache miss)");
        long totalLevels = levelRepo.count();
        long totalSpots = spotRepo.countTotalSpots();
        long availableSpots = spotRepo.countAvailableSpots();
        long occupiedSpots = spotRepo.countOccupiedSpots();
        long disabledSpots = spotRepo.countDisabledSpots();

        double occupancyPercentage = totalSpots > 0
                ? ((double) occupiedSpots / (totalSpots - disabledSpots)) * 100
                : 0;

        // Get per-level stats
        List<ParkingStatsResponse.LevelStats> levelStats = levelRepo.findAll().stream()
                .map(level -> {
                    long levelTotal = spotRepo.countByLevelId(level.getId());
                    long levelAvailable = spotRepo.countByLevelIdAndStatus(level.getId(), ParkingSpot.SpotStatus.AVAILABLE);
                    long levelOccupied = spotRepo.countByLevelIdAndStatus(level.getId(), ParkingSpot.SpotStatus.OCCUPIED);
                    long levelDisabled = spotRepo.countByLevelIdAndStatus(level.getId(), ParkingSpot.SpotStatus.DISABLED);

                    double levelOccupancy = (levelTotal - levelDisabled) > 0
                            ? ((double) levelOccupied / (levelTotal - levelDisabled)) * 100
                            : 0;

                    return ParkingStatsResponse.LevelStats.builder()
                            .levelId(level.getId())
                            .levelNumber(level.getLevelNumber())
                            .levelName(level.getName())
                            .totalSpots(levelTotal)
                            .availableSpots(levelAvailable)
                            .occupiedSpots(levelOccupied)
                            .disabledSpots(levelDisabled)
                            .occupancyPercentage(Math.round(levelOccupancy * 100.0) / 100.0)
                            .build();
                })
                .collect(Collectors.toList());

        return ParkingStatsResponse.builder()
                .totalLevels(totalLevels)
                .totalSpots(totalSpots)
                .availableSpots(availableSpots)
                .occupiedSpots(occupiedSpots)
                .disabledSpots(disabledSpots)
                .occupancyPercentage(Math.round(occupancyPercentage * 100.0) / 100.0)
                .levelStats(levelStats)
                .build();
    }
}
