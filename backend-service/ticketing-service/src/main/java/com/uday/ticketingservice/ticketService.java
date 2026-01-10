package com.uday.ticketingservice;

import com.uday.ticketingservice.DTO.CreateTicketRequest;
import com.uday.ticketingservice.DTO.PaymentRequest;
import com.uday.ticketingservice.DTO.PaymentResponse;
import com.uday.ticketingservice.DTO.SystemStatsResponse;
import com.uday.ticketingservice.DTO.TicketResponse;
import com.uday.ticketingservice.Entity.Reservation;
import com.uday.ticketingservice.Entity.Ticket;
import com.uday.ticketingservice.Entity.Ticket.TicketStatus;
import com.uday.ticketingservice.Repository.ReservationRepository;
import com.uday.ticketingservice.Repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ticketService {

    @Autowired
    private TicketRepository ticketRepo;

    @Autowired
    private ReservationRepository reservationRepo;

    @Autowired
    private WebClient webClient;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "tickets", allEntries = true),
        @CacheEvict(value = "ticketingStats", allEntries = true),
        @CacheEvict(value = "adminTickets", allEntries = true)
    })
    public Ticket createTicket(CreateTicketRequest req) {
        System.out.println("Creating ticket (caches will be evicted)");

        // check for existing active ticket
        Optional<Ticket> existing = ticketRepo.findByVehicleNumberAndExitTimeIsNull(req.getVehicleNumber());
        if (existing.isPresent()) {
            System.out.println("Active ticket already exists for vehicle: " + req.getVehicleNumber());
            return existing.get();
        }

        // check for blocking reservation
        LocalDateTime now = LocalDateTime.now();
        checkForBlockingReservation(req.getSpotId(), now);

        // occupy spot first (with pessimistic locking in parking-lot-service)
        try {
            occupySpot(req.getSpotId());
            System.out.println("Spot " + req.getSpotId() + " occupied successfully");
        } catch (WebClientResponseException e) {
            System.out.println("Failed to occupy spot: " + e.getResponseBodyAsString());
            throw new IllegalStateException("Spot is not available: " + e.getResponseBodyAsString());
        } catch (Exception e) {
            System.out.println("Failed to occupy spot: " + e.getMessage());
            throw new IllegalStateException("Failed to reserve parking spot: " + e.getMessage());
        }

        Ticket ticket = Ticket.builder()
                .userId(req.getUserId())
                .userEmail(req.getUserEmail())
                .vehicleNumber(req.getVehicleNumber())
                .spotId(req.getSpotId())
                .levelId(req.getLevelId())
                .entryTime(LocalDateTime.now())
                .status(TicketStatus.ACTIVE)
                .build();

        return ticketRepo.save(ticket);
    }

    private void checkForBlockingReservation(Long spotId, LocalDateTime ticketStartTime) {
        Optional<Reservation> blocking = reservationRepo.findBlockingReservationForSpot(spotId, ticketStartTime);

        if (blocking.isPresent()) {
            Reservation r = blocking.get();
            String window = r.getStartTime().format(TIME_FMT) + " - " + r.getEndTime().format(TIME_FMT);

            System.out.println("Ticket creation blocked: Spot " + spotId +
                             " has reservation #" + r.getId() + " from " + window);

            throw new IllegalStateException(
                "This spot is reserved from " + window +
                ". Please choose a different spot or wait until " +
                r.getEndTime().format(TIME_FMT) + "."
            );
        }
    }

    private void occupySpot(Long spotId) {
        webClient.put()
                .uri("http://PARKING-LOT-SERVICE:8084/parking/spots/{spotId}/occupy", spotId)
                .retrieve()
                .bodyToMono(Void.class)
                .block();
    }

    // legacy create method (backward compatible)
    @Transactional
    public Ticket createTicket(Long spotId, String vehicleNumber) {
        Optional<Ticket> existing = ticketRepo.findByVehicleNumberAndExitTimeIsNull(vehicleNumber);
        if (existing.isPresent()) {
            System.out.println("Active ticket already exists");
            return existing.get();
        }

        checkForBlockingReservation(spotId, LocalDateTime.now());

        Ticket ticket = new Ticket();
        ticket.setSpotId(spotId);
        ticket.setVehicleNumber(vehicleNumber);
        ticket.setEntryTime(LocalDateTime.now());
        ticket.setStatus(TicketStatus.ACTIVE);
        ticket.setUserId("system");
        ticket.setUserEmail("system@parking.com");

        return ticketRepo.save(ticket);
    }

    public List<TicketResponse> getUserTickets(String userEmail) {
        return ticketRepo.findByUserEmailOrderByEntryTimeDesc(userEmail)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<TicketResponse> getUserActiveTickets(String userEmail) {
        return ticketRepo.findByUserEmailAndStatus(userEmail, TicketStatus.ACTIVE)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public TicketResponse getUserTicket(Long ticketId, String userEmail) {
        Ticket ticket = ticketRepo.findByIdAndUserEmail(ticketId, userEmail)
                .orElseThrow(() -> new RuntimeException("Ticket not found or access denied"));
        return toResponse(ticket);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "tickets", allEntries = true),
        @CacheEvict(value = "ticketingStats", allEntries = true),
        @CacheEvict(value = "adminTickets", allEntries = true)
    })
    public TicketResponse exitUserVehicle(Long ticketId, String userEmail) {
        System.out.println("Exiting vehicle (caches will be evicted)");
        Ticket ticket = ticketRepo.findByIdAndUserEmail(ticketId, userEmail)
                .orElseThrow(() -> new RuntimeException("Ticket not found or access denied"));

        if (ticket.getStatus() == TicketStatus.CLOSED || ticket.getExitTime() != null) {
            throw new IllegalStateException("Ticket already closed");
        }

        double fee = calculateFee(ticket.getEntryTime());

        // payment must succeed before closing
        processPayment(ticketId, ticket.getVehicleNumber(), (int) fee);
        System.out.println("Payment processed successfully for ticket " + ticketId);

        ticket.setExitTime(LocalDateTime.now());
        ticket.setStatus(TicketStatus.CLOSED);
        ticket.setFee(fee);

        Ticket saved = ticketRepo.save(ticket);

        try {
            releaseSpot(saved.getSpotId());
            System.out.println("Spot " + saved.getSpotId() + " released successfully");
        } catch (Exception e) {
            System.out.println("Warning: Failed to release spot: " + e.getMessage());
            // don't fail exit - ticket already closed and payment processed
        }

        TicketResponse response = toResponse(saved);
        response.setMessage("Payment successful. Vehicle exited. Fee: Rs." + saved.getFee());
        return response;
    }

    private void processPayment(Long ticketId, String vehicleNumber, int amount) {
        PaymentRequest paymentReq = PaymentRequest.builder()
                .ticketId(ticketId)
                .vehicleNumber(vehicleNumber)
                .amount(amount)
                .build();

        try {
            PaymentResponse response = webClient.post()
                    .uri("http://PAYMENT-SERVICE:8083/payments/create")
                    .bodyValue(paymentReq)
                    .retrieve()
                    .bodyToMono(PaymentResponse.class)
                    .block();

            if (response == null) {
                throw new IllegalStateException("Payment service returned no response");
            }

            if (!"SUCCESS".equalsIgnoreCase(response.getStatus())) {
                String reason = response.getReason() != null ? response.getReason() :
                               response.getError() != null ? response.getError() : "Unknown error";
                throw new IllegalStateException("Payment failed: " + reason);
            }

            System.out.println("Payment successful: " + response.getPaymentId());

        } catch (WebClientResponseException e) {
            System.out.println("Payment service error: " + e.getResponseBodyAsString());
            throw new IllegalStateException("Payment service error: " + e.getMessage());
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            System.out.println("Payment failed: " + e.getMessage());
            throw new IllegalStateException("Payment failed: " + e.getMessage());
        }
    }

    private void releaseSpot(Long spotId) {
        webClient.put()
                .uri("http://PARKING-LOT-SERVICE:8084/parking/spots/{spotId}/release", spotId)
                .retrieve()
                .bodyToMono(Void.class)
                .block();
    }

    // admin operations

    public List<TicketResponse> getAllTickets() {
        return ticketRepo.findAllByOrderByEntryTimeDesc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<TicketResponse> getAllActiveTickets() {
        return ticketRepo.findByStatusOrderByEntryTimeDesc(TicketStatus.ACTIVE)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "ticketingStats", key = "'system'")
    public SystemStatsResponse getSystemStats() {
        System.out.println("Fetching ticketing stats from database (cache miss)");
        long total = ticketRepo.count();
        long active = ticketRepo.countByStatus(TicketStatus.ACTIVE);
        long closed = ticketRepo.countByStatus(TicketStatus.CLOSED);
        long activeVehicles = ticketRepo.countActiveVehicles();

        return SystemStatsResponse.builder()
                .totalTickets(total)
                .activeTickets(active)
                .closedTickets(closed)
                .activeVehicles(activeVehicles)
                .build();
    }

    @Cacheable(value = "tickets", key = "#ticketId")
    public Ticket getTicket(Long ticketId) {
        System.out.println("Fetching ticket from database (cache miss): " + ticketId);
        return ticketRepo.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "tickets", allEntries = true),
        @CacheEvict(value = "ticketingStats", allEntries = true),
        @CacheEvict(value = "adminTickets", allEntries = true)
    })
    public Ticket exit(Long ticketId) {
        System.out.println("Admin exiting vehicle (caches will be evicted)");
        Ticket ticket = ticketRepo.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found: " + ticketId));

        if (ticket.getExitTime() != null) {
            throw new IllegalStateException("Ticket already closed");
        }

        double fee = calculateFee(ticket.getEntryTime());

        processPayment(ticketId, ticket.getVehicleNumber(), (int) fee);
        System.out.println("Payment processed successfully for ticket " + ticketId + " (admin exit)");

        ticket.setExitTime(LocalDateTime.now());
        ticket.setStatus(TicketStatus.CLOSED);
        ticket.setFee(fee);

        Ticket saved = ticketRepo.save(ticket);

        try {
            releaseSpot(saved.getSpotId());
            System.out.println("Spot " + saved.getSpotId() + " released successfully (admin exit)");
        } catch (Exception e) {
            System.out.println("Warning: Failed to release spot: " + e.getMessage());
        }

        return saved;
    }

    private double calculateFee(LocalDateTime entryTime) {
        long hours = ChronoUnit.HOURS.between(entryTime, LocalDateTime.now());
        return Math.max(50, hours * 50); // minimum Rs.50, then Rs.50/hour
    }

    private TicketResponse toResponse(Ticket t) {
        return TicketResponse.builder()
                .id(t.getId())
                .userId(t.getUserId())
                .userEmail(t.getUserEmail())
                .vehicleNumber(t.getVehicleNumber())
                .spotId(t.getSpotId())
                .levelId(t.getLevelId())
                .entryTime(t.getEntryTime())
                .exitTime(t.getExitTime())
                .status(t.getStatus())
                .fee(t.getFee())
                .build();
    }
}
