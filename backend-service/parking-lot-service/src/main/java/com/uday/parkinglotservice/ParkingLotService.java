package com.uday.parkinglotservice;
import com.uday.parkinglotservice.DTO.*;
import com.uday.parkinglotservice.Entity.ParkingLevel;
import com.uday.parkinglotservice.Entity.ParkingSpot;
import com.uday.parkinglotservice.Repository.ParkingLevelRepository;
import com.uday.parkinglotservice.Repository.ParkingSpotRepository;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.web.reactive.function.client.WebClientRequestException;

import javax.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

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

    public List<ParkingLevel> getAllLevels() {
        return levelRepo.findAll();
    }

//    public ParkingLevel addLevel(ParkingLevel level) {
//        return levelRepo.save(level);
//    }

    public ParkingLevel addLevel(ParkingLevel level) {
        if (level.getSpots() != null) {
            level.getSpots().forEach(spot -> spot.setLevel(level));
        }
        return levelRepo.save(level);
    }

    public List<ParkingSpot> getAvailableSpots(Long levelId, boolean isDisabled) {
        return spotRepo.findByLevelIdAndIsOccupiedFalseAndIsDisabled(levelId, isDisabled);
    }

    @Transactional
    public ParkingSpot allocateSpot(Long levelId, boolean isDisabled) {

        List<ParkingSpot> spots =
                spotRepo.findAvailableSpotsForUpdate(levelId, isDisabled);
        System.out.println(spots);
        if (spots.isEmpty()) {
            System.out.println("Parking Spots : "+spots);
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
                    .uri("http://TICKETING-SERVICE:8082/ticketing/create?spotId={spotId}&vehicleNumber={vehicleNumber}",spotId,vehicleNumber)
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
        try{
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
        }
        catch (WebClientRequestException ex) {
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
            System.out.println("this is the response : "+response);
            throw new IllegalStateException("Payment failed");
        }
    }


    public void paymentFallback(Long ticketId, double amount, Throwable ex) {
        throw new IllegalStateException(
                "Payment service unavailable. Exit denied.", ex
        );
    }


}
