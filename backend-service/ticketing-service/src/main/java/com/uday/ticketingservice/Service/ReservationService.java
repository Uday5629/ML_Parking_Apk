package com.uday.ticketingservice.Service;

import com.uday.ticketingservice.DTO.*;
import com.uday.ticketingservice.Entity.Reservation;
import com.uday.ticketingservice.Entity.ReservationStatus;
import com.uday.ticketingservice.Repository.ReservationRepository;
import com.uday.ticketingservice.ticketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReservationService {

    @Autowired
    private ReservationRepository reservationRepo;

    @Autowired
    private ticketService ticketService;

    @Autowired
    private WebClient webClient;

    // booking constraints
    private static final int MAX_ADVANCE_DAYS = 3;
    private static final int MAX_HOURS = 4;
    private static final int MIN_MINUTES = 30;
    private static final int GRACE_MINUTES = 10;
    private static final LocalTime OPEN_TIME = LocalTime.of(6, 0);
    private static final LocalTime CLOSE_TIME = LocalTime.of(22, 0);

    @Transactional
    public ReservationResponse createReservation(CreateReservationRequest req) {
        validateTimeWindow(req.getStartTime(), req.getEndTime());

        // check conflicts
        if (reservationRepo.existsSpotConflict(req.getSpotId(), req.getStartTime(), req.getEndTime())) {
            throw new IllegalStateException("Spot is already reserved for this time slot");
        }

        String vehicleNum = req.getVehicleNumber().toUpperCase();
        if (reservationRepo.existsVehicleConflict(vehicleNum, req.getStartTime(), req.getEndTime())) {
            throw new IllegalStateException("You already have a reservation during this time");
        }

        Reservation reservation = Reservation.builder()
            .userId(req.getUserId())
            .userEmail(req.getUserEmail())
            .vehicleNumber(vehicleNum)
            .spotId(req.getSpotId())
            .levelId(req.getLevelId())
            .startTime(req.getStartTime())
            .endTime(req.getEndTime())
            .status(ReservationStatus.CREATED)
            .build();

        reservation = reservationRepo.save(reservation);
        System.out.println("Created reservation #" + reservation.getId());

        return toResponse(reservation, "Reservation confirmed successfully");
    }

    public List<ReservationResponse> getUserReservations(String email) {
        return reservationRepo.findByUserEmailOrderByStartTimeDesc(email)
            .stream()
            .map(r -> toResponse(r, null))
            .collect(Collectors.toList());
    }

    public List<ReservationResponse> getUserActiveReservations(String email) {
        return reservationRepo.findActiveReservationsByEmail(email)
            .stream()
            .map(r -> toResponse(r, null))
            .collect(Collectors.toList());
    }

    public ReservationResponse getReservation(Long id, String email) {
        Reservation r = reservationRepo.findByIdAndUserEmail(id, email)
            .orElseThrow(() -> new RuntimeException("Reservation not found"));
        return toResponse(r, null);
    }

    @Transactional
    public ReservationResponse cancelReservation(Long id, String email) {
        Reservation r = reservationRepo.findByIdAndUserEmail(id, email)
            .orElseThrow(() -> new RuntimeException("Reservation not found"));

        if (!r.canCancel(LocalDateTime.now())) {
            throw new IllegalStateException("Cannot cancel - reservation has already started or is not in CREATED status");
        }

        r.setStatus(ReservationStatus.CANCELLED);
        reservationRepo.save(r);

        return toResponse(r, "Reservation cancelled successfully");
    }

    @Transactional
    public CheckInResponse checkIn(Long reservationId, String email) {
        Reservation r = reservationRepo.findByIdAndUserEmail(reservationId, email)
            .orElseThrow(() -> new RuntimeException("Reservation not found"));

        LocalDateTime now = LocalDateTime.now();

        if (!r.canCheckIn(now)) {
            LocalTime windowStart = r.getStartTime().minusMinutes(GRACE_MINUTES).toLocalTime();
            LocalTime windowEnd = r.getStartTime().plusMinutes(GRACE_MINUTES).toLocalTime();

            if (now.isBefore(r.getStartTime().minusMinutes(GRACE_MINUTES))) {
                throw new IllegalStateException("Too early to check in. Window opens at " + windowStart);
            }
            if (r.isExpired(now)) {
                throw new IllegalStateException("Reservation expired. Window was " + windowStart + " to " + windowEnd);
            }
            throw new IllegalStateException("Cannot check in to this reservation");
        }

        // create ticket from reservation
        CreateTicketRequest ticketReq = new CreateTicketRequest();
        ticketReq.setUserId(r.getUserId());
        ticketReq.setUserEmail(r.getUserEmail());
        ticketReq.setVehicleNumber(r.getVehicleNumber());
        ticketReq.setSpotId(r.getSpotId());
        ticketReq.setLevelId(r.getLevelId());

        var ticket = ticketService.createTicket(ticketReq);

        r.setStatus(ReservationStatus.ACTIVE);
        r.setTicketId(ticket.getId());
        reservationRepo.save(r);

        System.out.println("Check-in: reservation #" + reservationId + " -> ticket #" + ticket.getId());

        return CheckInResponse.builder()
            .reservationId(reservationId)
            .ticketId(ticket.getId())
            .status("ACTIVE")
            .message("Checked in successfully. Your parking session is now active.")
            .build();
    }

    public AvailableSlotsResponse getAvailableSlots(Long spotId, LocalDate date) {
        List<TimeSlot> slots = generateDaySlots(date);
        int totalSlots = slots.size();

        List<Reservation> booked = reservationRepo.findBySpotIdAndDate(spotId, date);
        for (Reservation r : booked) {
            slots.removeIf(slot -> slot.overlaps(r.getStartTime(), r.getEndTime()));
        }

        // remove past slots for today
        if (date.equals(LocalDate.now())) {
            LocalDateTime now = LocalDateTime.now();
            slots.removeIf(slot -> slot.getEnd().isBefore(now));
        }

        return AvailableSlotsResponse.builder()
            .spotId(spotId)
            .date(date)
            .availableSlots(slots)
            .totalSlots(totalSlots)
            .bookedSlots(totalSlots - slots.size())
            .build();
    }

    public boolean isSlotAvailable(Long spotId, LocalDateTime start, LocalDateTime end) {
        return !reservationRepo.existsSpotConflict(spotId, start, end);
    }

    public List<ReservationResponse> getAllReservations() {
        return reservationRepo.findAllByOrderByStartTimeDesc()
            .stream()
            .map(r -> toResponse(r, null))
            .collect(Collectors.toList());
    }

    public List<Long> getBlockedSpotIds(Long levelId) {
        return reservationRepo.findCurrentlyBlockedSpotIds(levelId, LocalDateTime.now());
    }

    @Transactional
    public int expireNoShowReservations() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(GRACE_MINUTES);
        List<Reservation> expired = reservationRepo.findExpiredReservations(cutoff);

        for (Reservation r : expired) {
            r.setStatus(ReservationStatus.EXPIRED);
        }

        if (!expired.isEmpty()) {
            reservationRepo.saveAll(expired);
            System.out.println("Expired " + expired.size() + " no-show reservations");
        }

        return expired.size();
    }

    // --- private helpers ---

    private void validateTimeWindow(LocalDateTime start, LocalDateTime end) {
        LocalDateTime now = LocalDateTime.now();

        if (start.isBefore(now)) {
            throw new IllegalArgumentException("Start time must be in the future");
        }
        if (start.isAfter(now.plusDays(MAX_ADVANCE_DAYS))) {
            throw new IllegalArgumentException("Cannot book more than " + MAX_ADVANCE_DAYS + " days in advance");
        }

        long mins = Duration.between(start, end).toMinutes();
        if (mins < MIN_MINUTES) {
            throw new IllegalArgumentException("Minimum duration is " + MIN_MINUTES + " minutes");
        }
        if (mins > MAX_HOURS * 60) {
            throw new IllegalArgumentException("Maximum duration is " + MAX_HOURS + " hours");
        }

        // must align to 30-min slots
        if (start.getMinute() % 30 != 0 || end.getMinute() % 30 != 0) {
            throw new IllegalArgumentException("Times must be on :00 or :30");
        }
    }

    private List<TimeSlot> generateDaySlots(LocalDate date) {
        List<TimeSlot> slots = new ArrayList<>();
        LocalDateTime current = date.atTime(OPEN_TIME);
        LocalDateTime end = date.atTime(CLOSE_TIME);

        while (current.isBefore(end)) {
            slots.add(new TimeSlot(current, current.plusMinutes(30)));
            current = current.plusMinutes(30);
        }
        return slots;
    }

    private ReservationResponse toResponse(Reservation r, String msg) {
        LocalDateTime now = LocalDateTime.now();
        long minsUntil = Duration.between(now, r.getStartTime()).toMinutes();

        return ReservationResponse.builder()
            .id(r.getId())
            .userId(r.getUserId())
            .userEmail(r.getUserEmail())
            .vehicleNumber(r.getVehicleNumber())
            .spotId(r.getSpotId())
            .levelId(r.getLevelId())
            .startTime(r.getStartTime())
            .endTime(r.getEndTime())
            .status(r.getStatus())
            .ticketId(r.getTicketId())
            .createdAt(r.getCreatedAt())
            .canCheckIn(r.canCheckIn(now))
            .canCancel(r.canCancel(now))
            .minutesUntilStart(Math.max(0, minsUntil))
            .message(msg)
            .build();
    }
}
