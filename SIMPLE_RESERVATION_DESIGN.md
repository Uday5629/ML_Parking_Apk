# Simplified Parking Spot Reservation System

A lightweight reservation feature that integrates with the existing parking application with minimal changes.

---

## 1. Feature Scope

### What Users Can Do
- Reserve a parking spot for a future 30-minute time slot
- View their reservations
- Cancel a reservation (before it starts)
- Check-in when they arrive (converts reservation to active ticket)

### What The System Does
- Prevents double-booking of the same spot
- Auto-expires reservations if user doesn't check in within 10 minutes
- Sends a simple notification on successful reservation

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Time slots | Fixed 30-min blocks | Simplifies overlap detection |
| Max duration | 4 hours (8 slots) | Prevents hoarding |
| Advance booking | Up to 3 days | Practical limit |
| Pricing | Flat fee (same as walk-in) | No refund complexity |
| Grace period | 10 minutes | Balance between flexibility and efficiency |
| Locking | Simple `@Transactional` | Sufficient for moderate traffic |

---

## 3. Database Changes

### New Table: `reservation`

```sql
CREATE TABLE reservation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- User info (reuse existing pattern)
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,

    -- Spot info
    spot_id BIGINT NOT NULL,
    level_id BIGINT NOT NULL,

    -- Time window
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,

    -- Status: CREATED, ACTIVE, EXPIRED, CANCELLED
    status VARCHAR(20) NOT NULL DEFAULT 'CREATED',

    -- Link to ticket when checked in
    ticket_id BIGINT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevent double-booking at DB level
    UNIQUE KEY uk_spot_time (spot_id, start_time, status),

    INDEX idx_user_email (user_email),
    INDEX idx_status (status),
    INDEX idx_start_time (start_time)
);
```

### No Changes To Existing Tables
- `parking_spot` - No changes needed (we check reservation table for conflicts)
- `ticket` - No changes needed (reservation links to ticket on check-in)

---

## 4. Entity Class

### Reservation.java (ticketing-service)

```java
package com.uday.ticketingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservation")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String userEmail;

    @Column(nullable = false)
    private String vehicleNumber;

    @Column(nullable = false)
    private Long spotId;

    @Column(nullable = false)
    private Long levelId;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReservationStatus status = ReservationStatus.CREATED;

    // Links to ticket after check-in
    private Long ticketId;

    @Column(updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // Helper methods
    public boolean canCheckIn(LocalDateTime now) {
        // Can check in from 10 min before to 10 min after start time
        return status == ReservationStatus.CREATED
            && now.isAfter(startTime.minusMinutes(10))
            && now.isBefore(startTime.plusMinutes(10));
    }

    public boolean canCancel(LocalDateTime now) {
        return status == ReservationStatus.CREATED
            && now.isBefore(startTime);
    }

    public boolean isExpired(LocalDateTime now) {
        return status == ReservationStatus.CREATED
            && now.isAfter(startTime.plusMinutes(10));
    }
}

// Simple enum in same file or separate
enum ReservationStatus {
    CREATED,    // Reservation made, waiting for user
    ACTIVE,     // User checked in, parking in progress
    EXPIRED,    // User didn't show up
    CANCELLED   // User cancelled
}
```

---

## 5. API Endpoints

### 5.1 Create Reservation

**Endpoint:** `POST /reservations`

**Request:**
```json
{
  "userEmail": "john@example.com",
  "vehicleNumber": "KA01AB1234",
  "spotId": 15,
  "levelId": 2,
  "startTime": "2024-01-20T10:00:00",
  "endTime": "2024-01-20T12:00:00"
}
```

**Response (201 Created):**
```json
{
  "id": 101,
  "userEmail": "john@example.com",
  "vehicleNumber": "KA01AB1234",
  "spotId": 15,
  "spotCode": "B-15",
  "levelId": 2,
  "startTime": "2024-01-20T10:00:00",
  "endTime": "2024-01-20T12:00:00",
  "status": "CREATED",
  "message": "Reservation confirmed"
}
```

**Error Response (409 Conflict):**
```json
{
  "error": "Spot is already reserved for this time slot",
  "availableSlots": ["10:30", "11:00", "11:30"]
}
```

---

### 5.2 Get User Reservations

**Endpoint:** `GET /reservations?email={email}`

**Response (200 OK):**
```json
{
  "reservations": [
    {
      "id": 101,
      "spotCode": "B-15",
      "levelName": "Level 2",
      "startTime": "2024-01-20T10:00:00",
      "endTime": "2024-01-20T12:00:00",
      "status": "CREATED",
      "canCheckIn": false,
      "canCancel": true
    }
  ]
}
```

---

### 5.3 Cancel Reservation

**Endpoint:** `DELETE /reservations/{id}?email={email}`

**Response (200 OK):**
```json
{
  "id": 101,
  "status": "CANCELLED",
  "message": "Reservation cancelled successfully"
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Cannot cancel - reservation has already started"
}
```

---

### 5.4 Check-In (Convert to Active Ticket)

**Endpoint:** `POST /reservations/{id}/check-in?email={email}`

**Response (200 OK):**
```json
{
  "reservationId": 101,
  "ticketId": 555,
  "status": "ACTIVE",
  "spotCode": "B-15",
  "message": "Checked in successfully. Your ticket is now active."
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Check-in window not open. You can check in from 09:50 to 10:10"
}
```

---

## 6. Service Layer

### ReservationService.java

```java
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final TicketService ticketService;
    private final ParkingLotClient parkingLotClient;
    private final NotificationClient notificationClient;

    private static final int MAX_ADVANCE_DAYS = 3;
    private static final int MAX_DURATION_HOURS = 4;
    private static final int GRACE_PERIOD_MINUTES = 10;

    /**
     * Create a new reservation
     */
    @Transactional
    public ReservationResponse createReservation(CreateReservationRequest request) {

        // 1. Validate time window
        validateTimeWindow(request.getStartTime(), request.getEndTime());

        // 2. Check if spot exists and is not disabled
        SpotInfo spot = parkingLotClient.getSpotInfo(request.getSpotId());
        if (spot.isDisabled()) {
            throw new BadRequestException("This spot is not available");
        }

        // 3. Check for conflicts (simple query)
        boolean hasConflict = reservationRepository.existsConflict(
            request.getSpotId(),
            request.getStartTime(),
            request.getEndTime()
        );

        if (hasConflict) {
            throw new ConflictException("Spot is already reserved for this time");
        }

        // 4. Check user doesn't have overlapping reservation
        boolean userHasConflict = reservationRepository.existsUserConflict(
            request.getVehicleNumber(),
            request.getStartTime(),
            request.getEndTime()
        );

        if (userHasConflict) {
            throw new ConflictException("You already have a reservation during this time");
        }

        // 5. Create reservation
        Reservation reservation = Reservation.builder()
            .userId(request.getUserId())
            .userEmail(request.getUserEmail())
            .vehicleNumber(request.getVehicleNumber().toUpperCase())
            .spotId(request.getSpotId())
            .levelId(request.getLevelId())
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .status(ReservationStatus.CREATED)
            .build();

        reservation = reservationRepository.save(reservation);

        // 6. Send notification (fire and forget)
        notificationClient.sendReservationConfirmation(reservation);

        return toResponse(reservation, spot);
    }

    /**
     * Cancel a reservation
     */
    @Transactional
    public ReservationResponse cancelReservation(Long id, String userEmail) {

        Reservation reservation = reservationRepository
            .findByIdAndUserEmail(id, userEmail)
            .orElseThrow(() -> new NotFoundException("Reservation not found"));

        if (!reservation.canCancel(LocalDateTime.now())) {
            throw new BadRequestException("Cannot cancel - reservation has already started");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        return toResponse(reservation, null);
    }

    /**
     * Check in to reservation - creates a ticket
     */
    @Transactional
    public CheckInResponse checkIn(Long reservationId, String userEmail) {

        Reservation reservation = reservationRepository
            .findByIdAndUserEmail(reservationId, userEmail)
            .orElseThrow(() -> new NotFoundException("Reservation not found"));

        LocalDateTime now = LocalDateTime.now();

        if (!reservation.canCheckIn(now)) {
            String window = String.format("from %s to %s",
                reservation.getStartTime().minusMinutes(10).toLocalTime(),
                reservation.getStartTime().plusMinutes(10).toLocalTime());
            throw new BadRequestException("Check-in window: " + window);
        }

        // Create ticket using existing ticket service
        CreateTicketRequest ticketRequest = CreateTicketRequest.builder()
            .userId(reservation.getUserId())
            .userEmail(reservation.getUserEmail())
            .vehicleNumber(reservation.getVehicleNumber())
            .spotId(reservation.getSpotId())
            .levelId(reservation.getLevelId())
            .build();

        TicketResponse ticket = ticketService.createTicket(ticketRequest);

        // Update reservation
        reservation.setStatus(ReservationStatus.ACTIVE);
        reservation.setTicketId(ticket.getId());
        reservationRepository.save(reservation);

        return CheckInResponse.builder()
            .reservationId(reservationId)
            .ticketId(ticket.getId())
            .status("ACTIVE")
            .message("Checked in successfully")
            .build();
    }

    /**
     * Get user's reservations
     */
    public List<ReservationResponse> getUserReservations(String userEmail) {
        return reservationRepository
            .findByUserEmailOrderByStartTimeDesc(userEmail)
            .stream()
            .map(r -> toResponse(r, null))
            .toList();
    }

    /**
     * Check available slots for a spot on a date
     */
    public List<TimeSlot> getAvailableSlots(Long spotId, LocalDate date) {

        List<TimeSlot> allSlots = generateDaySlots(date);

        List<Reservation> existingReservations = reservationRepository
            .findBySpotIdAndDate(spotId, date);

        // Remove reserved slots
        for (Reservation r : existingReservations) {
            allSlots.removeIf(slot ->
                slot.overlaps(r.getStartTime(), r.getEndTime()));
        }

        return allSlots;
    }

    // === Private Helpers ===

    private void validateTimeWindow(LocalDateTime start, LocalDateTime end) {
        LocalDateTime now = LocalDateTime.now();

        if (start.isBefore(now)) {
            throw new BadRequestException("Start time must be in the future");
        }

        if (start.isAfter(now.plusDays(MAX_ADVANCE_DAYS))) {
            throw new BadRequestException("Cannot book more than 3 days in advance");
        }

        long hours = Duration.between(start, end).toHours();
        if (hours > MAX_DURATION_HOURS) {
            throw new BadRequestException("Maximum duration is 4 hours");
        }

        if (hours < 0.5) {
            throw new BadRequestException("Minimum duration is 30 minutes");
        }

        // Validate 30-min slot alignment
        if (start.getMinute() % 30 != 0) {
            throw new BadRequestException("Start time must be on :00 or :30");
        }
    }

    private List<TimeSlot> generateDaySlots(LocalDate date) {
        List<TimeSlot> slots = new ArrayList<>();
        LocalDateTime current = date.atTime(6, 0); // 6 AM start
        LocalDateTime end = date.atTime(22, 0);    // 10 PM end

        while (current.isBefore(end)) {
            slots.add(new TimeSlot(current, current.plusMinutes(30)));
            current = current.plusMinutes(30);
        }
        return slots;
    }
}
```

---

## 7. Repository

### ReservationRepository.java

```java
@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    // Find by user
    List<Reservation> findByUserEmailOrderByStartTimeDesc(String userEmail);

    // Find by ID and user (ownership check)
    Optional<Reservation> findByIdAndUserEmail(Long id, String userEmail);

    // Check spot conflict - simple overlap check
    @Query("""
        SELECT COUNT(r) > 0 FROM Reservation r
        WHERE r.spotId = :spotId
        AND r.status IN ('CREATED', 'ACTIVE')
        AND r.startTime < :endTime
        AND r.endTime > :startTime
        """)
    boolean existsConflict(
        @Param("spotId") Long spotId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    // Check user/vehicle conflict
    @Query("""
        SELECT COUNT(r) > 0 FROM Reservation r
        WHERE r.vehicleNumber = :vehicleNumber
        AND r.status IN ('CREATED', 'ACTIVE')
        AND r.startTime < :endTime
        AND r.endTime > :startTime
        """)
    boolean existsUserConflict(
        @Param("vehicleNumber") String vehicleNumber,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    // Find reservations for a spot on a date
    @Query("""
        SELECT r FROM Reservation r
        WHERE r.spotId = :spotId
        AND r.status IN ('CREATED', 'ACTIVE')
        AND DATE(r.startTime) = :date
        """)
    List<Reservation> findBySpotIdAndDate(
        @Param("spotId") Long spotId,
        @Param("date") LocalDate date
    );

    // Find expired reservations (for scheduler)
    @Query("""
        SELECT r FROM Reservation r
        WHERE r.status = 'CREATED'
        AND r.startTime < :cutoff
        """)
    List<Reservation> findExpired(@Param("cutoff") LocalDateTime cutoff);
}
```

---

## 8. Background Job

### ReservationExpiryJob.java

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class ReservationExpiryJob {

    private final ReservationRepository reservationRepository;

    /**
     * Run every 5 minutes to expire no-show reservations
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void expireNoShowReservations() {

        // Find reservations where start_time + 10 min grace has passed
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(10);

        List<Reservation> expired = reservationRepository.findExpired(cutoff);

        for (Reservation r : expired) {
            r.setStatus(ReservationStatus.EXPIRED);
            log.info("Expired reservation {} for spot {}", r.getId(), r.getSpotId());
        }

        reservationRepository.saveAll(expired);

        if (!expired.isEmpty()) {
            log.info("Expired {} no-show reservations", expired.size());
        }
    }
}
```

---

## 9. DTOs

### Request/Response Classes

```java
// CreateReservationRequest.java
@Data
@Builder
public class CreateReservationRequest {
    private String userId;
    private String userEmail;
    private String vehicleNumber;
    private Long spotId;
    private Long levelId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}

// ReservationResponse.java
@Data
@Builder
public class ReservationResponse {
    private Long id;
    private String userEmail;
    private String vehicleNumber;
    private Long spotId;
    private String spotCode;
    private Long levelId;
    private String levelName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private Long ticketId;
    private Boolean canCheckIn;
    private Boolean canCancel;
    private String message;
}

// CheckInResponse.java
@Data
@Builder
public class CheckInResponse {
    private Long reservationId;
    private Long ticketId;
    private String status;
    private String spotCode;
    private String message;
}

// TimeSlot.java
@Data
@AllArgsConstructor
public class TimeSlot {
    private LocalDateTime start;
    private LocalDateTime end;

    public boolean overlaps(LocalDateTime otherStart, LocalDateTime otherEnd) {
        return start.isBefore(otherEnd) && end.isAfter(otherStart);
    }
}
```

---

## 10. Controller

### ReservationController.java

```java
@RestController
@RequestMapping("/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping
    public ResponseEntity<ReservationResponse> create(
            @RequestBody @Valid CreateReservationRequest request) {
        ReservationResponse response = reservationService.createReservation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ReservationResponse>> getUserReservations(
            @RequestParam String email) {
        return ResponseEntity.ok(reservationService.getUserReservations(email));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ReservationResponse> cancel(
            @PathVariable Long id,
            @RequestParam String email) {
        return ResponseEntity.ok(reservationService.cancelReservation(id, email));
    }

    @PostMapping("/{id}/check-in")
    public ResponseEntity<CheckInResponse> checkIn(
            @PathVariable Long id,
            @RequestParam String email) {
        return ResponseEntity.ok(reservationService.checkIn(id, email));
    }

    @GetMapping("/slots")
    public ResponseEntity<List<TimeSlot>> getAvailableSlots(
            @RequestParam Long spotId,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(reservationService.getAvailableSlots(spotId, date));
    }
}
```

---

## 11. Error Handling

### Simple Exception Classes

```java
// Reuse existing or add simple ones

@ResponseStatus(HttpStatus.CONFLICT)
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}

@ResponseStatus(HttpStatus.NOT_FOUND)
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
```

---

## 12. Integration with Existing Code

### How It Connects

```
┌─────────────────────────────────────────────────────────────────┐
│                     RESERVATION FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Creates Reservation                                       │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────┐                                           │
│  │ ReservationService │──▶ Check spot exists (parking-lot-svc) │
│  │    (NEW)          │──▶ Check conflicts (reservation table)  │
│  │                   │──▶ Save reservation                     │
│  └─────────────────┘                                           │
│         │                                                       │
│         ▼                                                       │
│  User Checks In (at spot, within window)                       │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────┐                                           │
│  │ ReservationService │                                        │
│  │    checkIn()      │                                         │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │  TicketService   │──▶ Uses EXISTING createTicket()          │
│  │   (EXISTING)     │──▶ Occupies spot via parking-lot-svc     │
│  └─────────────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  Normal ticket flow (exit via existing /ticketing/user/exit)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Integration Points

1. **Check-in reuses `TicketService.createTicket()`** - No changes needed to ticket creation
2. **Exit uses existing flow** - Once checked in, it's a regular ticket
3. **Spot status** - Reservation doesn't change spot status until check-in
4. **Notifications** - Uses existing notification service

---

## 13. What We're NOT Doing

| Feature | Why Skipped |
|---------|-------------|
| Complex pricing/overtime | Flat fee keeps it simple |
| Refund tiers | No prepayment = no refunds needed |
| RESERVED spot status | Check at reservation table instead |
| Pessimistic locking | `@Transactional` sufficient for typical load |
| Timezone handling | Assume single timezone (server time) |
| Modification API | User can cancel and rebook |
| Email/SMS notifications | Just in-app notification |

---

## 14. Files to Create/Modify

### New Files (ticketing-service)

```
src/main/java/com/uday/ticketingservice/
├── entity/
│   ├── Reservation.java
│   └── ReservationStatus.java
├── dto/
│   ├── CreateReservationRequest.java
│   ├── ReservationResponse.java
│   ├── CheckInResponse.java
│   └── TimeSlot.java
├── repository/
│   └── ReservationRepository.java
├── service/
│   └── ReservationService.java
├── controller/
│   └── ReservationController.java
└── scheduler/
    └── ReservationExpiryJob.java
```

### Modified Files

```
None required - we reuse existing TicketService.createTicket()
```

### Database Migration

```
src/main/resources/db/migration/
└── V2__add_reservation_table.sql
```

---

## 15. Testing Checklist

### Happy Path
- [ ] Create reservation for future slot
- [ ] View user reservations
- [ ] Cancel reservation before start time
- [ ] Check in within window
- [ ] Exit normally (uses existing ticket flow)

### Edge Cases
- [ ] Create reservation - spot already reserved → 409 Conflict
- [ ] Create reservation - past time → 400 Bad Request
- [ ] Create reservation - > 3 days ahead → 400 Bad Request
- [ ] Create reservation - > 4 hours duration → 400 Bad Request
- [ ] Cancel after start time → 400 Bad Request
- [ ] Check in too early → 400 Bad Request
- [ ] Check in too late (expired) → 400 Bad Request
- [ ] Scheduler expires old reservations

### Concurrency
- [ ] Two users reserve same slot simultaneously → One succeeds, one gets 409

---

## 16. Summary

This design adds parking reservations with:

- **1 new table** (`reservation`)
- **1 new entity** (`Reservation.java`)
- **1 new service** (`ReservationService.java`)
- **1 new controller** (`ReservationController.java`)
- **4 API endpoints** (create, list, cancel, check-in)
- **1 scheduled job** (expiry)
- **0 changes** to existing code

The check-in flow naturally transitions into the existing ticket system, so users exit using the same flow they already know.
