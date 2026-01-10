# Parking Spot Scheduling Feature - Implementation Plan

## Table of Contents
1. [Feature Overview](#1-feature-overview)
2. [User Flow](#2-user-flow)
3. [Backend Design](#3-backend-design)
4. [Business Rules](#4-business-rules)
5. [Frontend Changes](#5-frontend-changes)
6. [System Enhancements](#6-system-enhancements)
7. [Edge Cases](#7-edge-cases)
8. [Testing Strategy](#8-testing-strategy)
9. [Deliverables](#9-deliverables)

---

## 1. Feature Overview

### 1.1 What is "Scheduled Parking"?

Scheduled Parking allows users to **reserve a parking spot in advance** for a specific date, start time, and duration. Unlike the current walk-in system where users occupy spots immediately, this feature enables:

- **Advance Booking**: Reserve spots hours or days ahead
- **Time-Bounded Reservations**: Each reservation has a defined start and end time
- **Guaranteed Availability**: Reserved spots are blocked from other users during the reservation window
- **Seamless Transition**: Reserved spots automatically convert to active parking sessions when the user arrives

### 1.2 Key Assumptions

| Assumption | Details |
|------------|---------|
| **Time Unit** | Reservations are made in 30-minute slots |
| **Advance Booking Limit** | Users can book up to 7 days in advance |
| **Maximum Duration** | Single reservation can be 1-12 hours |
| **Minimum Duration** | 30 minutes |
| **Operating Hours** | System operates 24/7 (configurable per level) |
| **Timezone** | All times stored in UTC, displayed in user's local timezone |
| **One Active Reservation** | User can have only ONE scheduled reservation per vehicle at a time |
| **Payment Model** | Payment collected at reservation time (prepaid) OR at exit (postpaid - default) |

### 1.3 Constraints

| Constraint | Rationale |
|------------|-----------|
| No overlapping reservations for same spot | Prevents double-booking |
| No overlapping reservations for same vehicle | One vehicle can't be in two spots |
| Grace period of 15 minutes | User must arrive within 15 minutes of start time |
| Auto-expiry after grace period | Unused reservations are cancelled and spot released |
| No modification within 30 minutes of start | Prevents last-minute gaming |
| Cancellation penalty within 2 hours | Discourages frivolous bookings |

### 1.4 Reservation vs. Immediate Parking Comparison

| Aspect | Immediate (Current) | Scheduled (New) |
|--------|---------------------|-----------------|
| Spot Selection | At entry time | In advance |
| Availability Check | Real-time | Future time slot |
| Payment | At exit | At reservation OR exit |
| Spot Status | OCCUPIED immediately | RESERVED → OCCUPIED |
| Ticket Status | ACTIVE | SCHEDULED → ACTIVE → CLOSED |

---

## 2. User Flow

### 2.1 Reservation Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RESERVATION CREATION FLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌───────────┐    ┌────────────┐    ┌───────────────────┐  │
│  │  Select  │───▶│  Select   │───▶│   Check    │───▶│  Select Available │  │
│  │Date/Time │    │  Level    │    │Availability│    │       Spot        │  │
│  └──────────┘    └───────────┘    └────────────┘    └───────────────────┘  │
│                                          │                    │             │
│                                          ▼                    ▼             │
│                                   ┌────────────┐    ┌───────────────────┐  │
│                                   │ No Spots   │    │  Enter Vehicle    │  │
│                                   │ Available  │    │     Number        │  │
│                                   │  (Error)   │    └───────────────────┘  │
│                                   └────────────┘              │             │
│                                                               ▼             │
│  ┌──────────┐    ┌───────────┐    ┌────────────┐    ┌───────────────────┐  │
│  │Reservation│◀──│  Payment  │◀───│  Confirm   │◀───│ Review Booking    │  │
│  │ Created   │   │(Optional) │    │Reservation │    │    Summary        │  │
│  └──────────┘    └───────────┘    └────────────┘    └───────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Step-by-Step:**

1. **Select Date & Time**
   - User opens "Schedule Parking" page
   - Selects desired date (today to 7 days ahead)
   - Selects start time (30-minute intervals)
   - Selects duration (30 min to 12 hours)

2. **Select Level**
   - User chooses preferred parking level
   - System shows level summary (total spots, available for time slot)

3. **Check Availability**
   - System queries spots available for the entire duration
   - Considers existing reservations and occupied spots
   - Returns list of available spots

4. **Select Spot**
   - User picks from available spots
   - Shows spot details (code, type, accessibility)

5. **Enter Vehicle Number**
   - User enters vehicle registration
   - System validates no conflicting reservations for vehicle

6. **Review & Confirm**
   - Shows booking summary: date, time, duration, spot, estimated fee
   - User confirms reservation

7. **Reservation Created**
   - System creates reservation with SCHEDULED status
   - Spot marked as RESERVED for time window
   - Confirmation shown with reservation ID

### 2.2 Check-In Flow (Arrival)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHECK-IN FLOW (ARRIVAL)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌───────────┐    ┌────────────┐    ┌───────────────────┐  │
│  │  User    │───▶│  Enter    │───▶│  Validate  │───▶│  Activate         │  │
│  │ Arrives  │    │Vehicle No.│    │Reservation │    │  Reservation      │  │
│  └──────────┘    └───────────┘    └────────────┘    └───────────────────┘  │
│                                          │                    │             │
│                                          ▼                    ▼             │
│                                   ┌────────────┐    ┌───────────────────┐  │
│                                   │Early/Late/ │    │  Spot Status:     │  │
│                                   │ Not Found  │    │  RESERVED→OCCUPIED│  │
│                                   │  (Error)   │    └───────────────────┘  │
│                                   └────────────┘              │             │
│                                                               ▼             │
│                                                    ┌───────────────────┐   │
│                                                    │ Ticket Status:    │   │
│                                                    │ SCHEDULED→ACTIVE  │   │
│                                                    └───────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Check-In Rules:**
- User can check in starting 15 minutes BEFORE scheduled start time
- Must check in within 15 minutes AFTER scheduled start time (grace period)
- Check-in converts SCHEDULED → ACTIVE, RESERVED → OCCUPIED
- Actual entry time recorded (may differ from scheduled start)

### 2.3 Check-Out Flow (Exit)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHECK-OUT FLOW (EXIT)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌───────────┐    ┌────────────┐    ┌───────────────────┐  │
│  │  User    │───▶│  Request  │───▶│  Calculate │───▶│  Process          │  │
│  │  Exits   │    │   Exit    │    │    Fee     │    │   Payment         │  │
│  └──────────┘    └───────────┘    └────────────┘    └───────────────────┘  │
│                                          │                    │             │
│                                          ▼                    ▼             │
│                                   ┌────────────┐    ┌───────────────────┐  │
│                                   │Overtime Fee│    │  Release Spot     │  │
│                                   │ (if early  │    │  OCCUPIED→AVAIL   │  │
│                                   │  exit: no  │    └───────────────────┘  │
│                                   │  refund)   │              │             │
│                                   └────────────┘              ▼             │
│                                                    ┌───────────────────┐   │
│                                                    │ Ticket: CLOSED    │   │
│                                                    │ Exit time recorded│   │
│                                                    └───────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Fee Calculation:**
- **Early Exit**: Charged for scheduled duration (no refund for unused time)
- **On-Time Exit**: Charged for scheduled duration
- **Overtime Exit**: Base fee + overtime charges (1.5x rate per 30-min block)

### 2.4 Cancellation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CANCELLATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    CANCELLATION POLICY                                │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │  Time Before Start     │  Refund Policy                              │  │
│  │  ──────────────────────│─────────────────────────────────────────────│  │
│  │  > 24 hours            │  100% refund (if prepaid)                   │  │
│  │  2-24 hours            │  50% refund (if prepaid)                    │  │
│  │  < 2 hours             │  No refund (if prepaid)                     │  │
│  │  < 30 minutes          │  Cannot cancel (must check-in or no-show)   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────┐    ┌───────────┐    ┌────────────┐    ┌───────────────────┐  │
│  │  User    │───▶│  Confirm  │───▶│  Process   │───▶│  Release Spot     │  │
│  │ Cancels  │    │   Cancel  │    │   Refund   │    │  RESERVED→AVAIL   │  │
│  └──────────┘    └───────────┘    └────────────┘    └───────────────────┘  │
│                                                               │             │
│                                                               ▼             │
│                                                    ┌───────────────────┐   │
│                                                    │ Ticket: CANCELLED │   │
│                                                    └───────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.5 Modification Flow

**Allowed Modifications (if > 30 minutes before start):**
- Change duration (extend or reduce)
- Change spot (within same level)
- Change level (releases old spot, reserves new)

**Not Allowed:**
- Change date/time (must cancel and rebook)
- Modifications within 30 minutes of start time

---

## 3. Backend Design

### 3.1 Database Schema Changes

#### 3.1.1 New Table: `reservation` (in ticketing-service)

```sql
CREATE TABLE reservation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- User Information
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,

    -- Spot Information
    spot_id BIGINT NOT NULL,
    level_id BIGINT NOT NULL,

    -- Scheduling Information
    scheduled_start_time TIMESTAMP NOT NULL,
    scheduled_end_time TIMESTAMP NOT NULL,
    duration_minutes INT NOT NULL,

    -- Actual Times (populated on check-in/check-out)
    actual_entry_time TIMESTAMP NULL,
    actual_exit_time TIMESTAMP NULL,

    -- Status & Lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    -- SCHEDULED: Future reservation
    -- ACTIVE: User checked in, parking in progress
    -- COMPLETED: User checked out normally
    -- EXPIRED: User didn't show up within grace period
    -- CANCELLED: User cancelled reservation
    -- NO_SHOW: System expired after grace period

    -- Financial
    estimated_fee DECIMAL(10,2) NOT NULL,
    actual_fee DECIMAL(10,2) NULL,
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING: Not yet paid
    -- PREPAID: Paid at reservation time
    -- PAID: Paid at exit
    -- REFUNDED: Cancelled with refund
    -- PARTIAL_REFUND: Cancelled with partial refund
    payment_id VARCHAR(100) NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason VARCHAR(500) NULL,

    -- Indexes
    INDEX idx_user_email (user_email),
    INDEX idx_vehicle_number (vehicle_number),
    INDEX idx_spot_time (spot_id, scheduled_start_time, scheduled_end_time),
    INDEX idx_status (status),
    INDEX idx_scheduled_start (scheduled_start_time),

    -- Constraints
    CONSTRAINT chk_times CHECK (scheduled_end_time > scheduled_start_time),
    CONSTRAINT chk_duration CHECK (duration_minutes >= 30 AND duration_minutes <= 720)
);
```

#### 3.1.2 Modify Table: `parking_spot` (in parking-lot-service)

```sql
-- Add new status value to spot status enum
ALTER TABLE parking_spot
MODIFY COLUMN status ENUM('AVAILABLE', 'OCCUPIED', 'DISABLED', 'RESERVED')
DEFAULT 'AVAILABLE';

-- Add reservation tracking column
ALTER TABLE parking_spot
ADD COLUMN current_reservation_id BIGINT NULL;
```

#### 3.1.3 New Table: `spot_reservation_block` (in parking-lot-service)

This table tracks time-based reservations for spots to enable availability queries.

```sql
CREATE TABLE spot_reservation_block (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    spot_id BIGINT NOT NULL,
    reservation_id BIGINT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'BLOCKED',
    -- BLOCKED: Time slot reserved
    -- RELEASED: Reservation cancelled/completed

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_spot_time_range (spot_id, start_time, end_time),
    INDEX idx_reservation (reservation_id),

    FOREIGN KEY (spot_id) REFERENCES parking_spot(id) ON DELETE CASCADE
);
```

### 3.2 Entity Classes

#### 3.2.1 Reservation.java (ticketing-service)

```java
package com.uday.ticketingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
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

    @Column(nullable = false, length = 20)
    private String vehicleNumber;

    @Column(nullable = false)
    private Long spotId;

    @Column(nullable = false)
    private Long levelId;

    @Column(nullable = false)
    private LocalDateTime scheduledStartTime;

    @Column(nullable = false)
    private LocalDateTime scheduledEndTime;

    @Column(nullable = false)
    private Integer durationMinutes;

    private LocalDateTime actualEntryTime;

    private LocalDateTime actualExitTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReservationStatus status = ReservationStatus.SCHEDULED;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal estimatedFee;

    @Column(precision = 10, scale = 2)
    private BigDecimal actualFee;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    private String paymentId;

    @Column(updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    private LocalDateTime cancelledAt;

    private String cancellationReason;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper methods
    public boolean isScheduled() {
        return status == ReservationStatus.SCHEDULED;
    }

    public boolean isActive() {
        return status == ReservationStatus.ACTIVE;
    }

    public boolean canCheckIn(LocalDateTime now) {
        // Can check in 15 min before to 15 min after scheduled start
        LocalDateTime earliestCheckIn = scheduledStartTime.minusMinutes(15);
        LocalDateTime latestCheckIn = scheduledStartTime.plusMinutes(15);
        return now.isAfter(earliestCheckIn) && now.isBefore(latestCheckIn)
               && status == ReservationStatus.SCHEDULED;
    }

    public boolean isExpired(LocalDateTime now) {
        return status == ReservationStatus.SCHEDULED
               && now.isAfter(scheduledStartTime.plusMinutes(15));
    }

    public boolean canCancel(LocalDateTime now) {
        return status == ReservationStatus.SCHEDULED
               && now.isBefore(scheduledStartTime.minusMinutes(30));
    }

    public boolean canModify(LocalDateTime now) {
        return status == ReservationStatus.SCHEDULED
               && now.isBefore(scheduledStartTime.minusMinutes(30));
    }
}

// Enums
enum ReservationStatus {
    SCHEDULED,   // Future reservation, not yet started
    ACTIVE,      // User has checked in
    COMPLETED,   // User has checked out
    EXPIRED,     // Grace period passed, auto-cancelled
    CANCELLED,   // User cancelled
    NO_SHOW      // User didn't arrive (same as EXPIRED, for reporting)
}

enum PaymentStatus {
    PENDING,
    PREPAID,
    PAID,
    REFUNDED,
    PARTIAL_REFUND
}
```

#### 3.2.2 SpotReservationBlock.java (parking-lot-service)

```java
package com.uday.parkinglotservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "spot_reservation_block")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpotReservationBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long spotId;

    @Column(nullable = false)
    private Long reservationId;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BlockStatus status = BlockStatus.BLOCKED;

    @Column(updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}

enum BlockStatus {
    BLOCKED,
    RELEASED
}
```

### 3.3 DTO Classes

#### 3.3.1 Request DTOs

```java
// CreateReservationRequest.java
@Data
@Builder
public class CreateReservationRequest {
    @NotBlank
    private String userId;

    @NotBlank
    @Email
    private String userEmail;

    @NotBlank
    @Size(max = 20)
    private String vehicleNumber;

    @NotNull
    private Long spotId;

    @NotNull
    private Long levelId;

    @NotNull
    @Future
    private LocalDateTime scheduledStartTime;

    @NotNull
    @Min(30)
    @Max(720)
    private Integer durationMinutes;

    private Boolean isAccessible = false;
}

// CheckInRequest.java
@Data
public class CheckInRequest {
    @NotNull
    private Long reservationId;

    @NotBlank
    private String userEmail;

    @NotBlank
    private String vehicleNumber;
}

// CheckOutRequest.java
@Data
public class CheckOutRequest {
    @NotNull
    private Long reservationId;

    @NotBlank
    private String userEmail;
}

// CancelReservationRequest.java
@Data
public class CancelReservationRequest {
    @NotNull
    private Long reservationId;

    @NotBlank
    private String userEmail;

    private String cancellationReason;
}

// ModifyReservationRequest.java
@Data
public class ModifyReservationRequest {
    @NotNull
    private Long reservationId;

    @NotBlank
    private String userEmail;

    private Integer newDurationMinutes;

    private Long newSpotId;

    private Long newLevelId;
}

// CheckAvailabilityRequest.java
@Data
public class CheckAvailabilityRequest {
    @NotNull
    private Long levelId;

    @NotNull
    private LocalDateTime startTime;

    @NotNull
    @Min(30)
    @Max(720)
    private Integer durationMinutes;

    private Boolean isAccessible = false;
}
```

#### 3.3.2 Response DTOs

```java
// ReservationResponse.java
@Data
@Builder
public class ReservationResponse {
    private Long id;
    private String userId;
    private String userEmail;
    private String vehicleNumber;
    private Long spotId;
    private String spotCode;
    private Long levelId;
    private String levelName;
    private LocalDateTime scheduledStartTime;
    private LocalDateTime scheduledEndTime;
    private Integer durationMinutes;
    private LocalDateTime actualEntryTime;
    private LocalDateTime actualExitTime;
    private String status;
    private BigDecimal estimatedFee;
    private BigDecimal actualFee;
    private String paymentStatus;
    private LocalDateTime createdAt;
    private String message;

    // Computed fields
    private Boolean canCheckIn;
    private Boolean canCancel;
    private Boolean canModify;
    private Long minutesUntilStart;
}

// AvailabilityResponse.java
@Data
@Builder
public class AvailabilityResponse {
    private Long levelId;
    private String levelName;
    private LocalDateTime requestedStartTime;
    private LocalDateTime requestedEndTime;
    private Integer totalSpots;
    private Integer availableSpots;
    private List<AvailableSpotDTO> spots;
    private String message;
}

// AvailableSpotDTO.java
@Data
@Builder
public class AvailableSpotDTO {
    private Long spotId;
    private String spotCode;
    private String spotType;
    private Boolean isAccessible;
    private BigDecimal estimatedFee;
}

// ReservationStatsResponse.java
@Data
@Builder
public class ReservationStatsResponse {
    private Long totalReservations;
    private Long scheduledReservations;
    private Long activeReservations;
    private Long completedReservations;
    private Long cancelledReservations;
    private Long expiredReservations;
    private BigDecimal totalRevenue;
    private Double averageDurationMinutes;
    private Double occupancyRate;
}
```

### 3.4 API Endpoints

#### 3.4.1 Reservation Endpoints (ticketing-service)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/reservations/create` | Create new reservation | User |
| GET | `/reservations/availability` | Check spot availability | User |
| GET | `/reservations/user?email={email}` | Get user's reservations | User |
| GET | `/reservations/user/active?email={email}` | Get user's active/scheduled reservations | User |
| GET | `/reservations/{id}?email={email}` | Get specific reservation | User |
| PUT | `/reservations/{id}/check-in` | Check in to reservation | User |
| PUT | `/reservations/{id}/check-out` | Check out from reservation | User |
| PUT | `/reservations/{id}/cancel` | Cancel reservation | User |
| PUT | `/reservations/{id}/modify` | Modify reservation | User |
| GET | `/reservations/admin/all` | Get all reservations | Admin |
| GET | `/reservations/admin/stats` | Get reservation statistics | Admin |
| PUT | `/reservations/admin/{id}/force-expire` | Force expire reservation | Admin |

#### 3.4.2 Spot Availability Endpoints (parking-lot-service)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/parking/spots/available` | Get available spots for time range | User |
| POST | `/parking/spots/{id}/reserve` | Reserve spot for time range | Internal |
| PUT | `/parking/spots/{id}/activate-reservation` | Convert reserved to occupied | Internal |
| PUT | `/parking/spots/{id}/release-reservation` | Release reserved spot | Internal |
| GET | `/parking/spots/{id}/reservations` | Get spot's reservation blocks | Admin |

### 3.5 Service Layer Implementation

#### 3.5.1 ReservationService.java (ticketing-service)

```java
@Service
@RequiredArgsConstructor
@Transactional
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final WebClient.Builder webClientBuilder;
    private final FeeCalculator feeCalculator;

    // Configuration
    private static final int MAX_ADVANCE_DAYS = 7;
    private static final int MIN_DURATION_MINUTES = 30;
    private static final int MAX_DURATION_MINUTES = 720;
    private static final int GRACE_PERIOD_MINUTES = 15;
    private static final int EARLY_CHECKIN_MINUTES = 15;
    private static final int NO_CANCEL_WINDOW_MINUTES = 30;

    /**
     * Create a new reservation
     */
    @CacheEvict(value = {"reservations", "reservationStats"}, allEntries = true)
    public ReservationResponse createReservation(CreateReservationRequest request) {
        // 1. Validate request
        validateCreateRequest(request);

        // 2. Check for conflicting reservations (same vehicle)
        checkVehicleConflicts(request.getVehicleNumber(),
                              request.getScheduledStartTime(),
                              request.getScheduledStartTime().plusMinutes(request.getDurationMinutes()));

        // 3. Reserve spot in parking-lot-service (with pessimistic locking)
        reserveSpot(request.getSpotId(),
                   request.getScheduledStartTime(),
                   request.getScheduledStartTime().plusMinutes(request.getDurationMinutes()));

        // 4. Calculate estimated fee
        BigDecimal estimatedFee = feeCalculator.calculateFee(request.getDurationMinutes());

        // 5. Create reservation entity
        Reservation reservation = Reservation.builder()
            .userId(request.getUserId())
            .userEmail(request.getUserEmail())
            .vehicleNumber(request.getVehicleNumber().toUpperCase())
            .spotId(request.getSpotId())
            .levelId(request.getLevelId())
            .scheduledStartTime(request.getScheduledStartTime())
            .scheduledEndTime(request.getScheduledStartTime().plusMinutes(request.getDurationMinutes()))
            .durationMinutes(request.getDurationMinutes())
            .estimatedFee(estimatedFee)
            .status(ReservationStatus.SCHEDULED)
            .paymentStatus(PaymentStatus.PENDING)
            .build();

        reservation = reservationRepository.save(reservation);

        return buildResponse(reservation, "Reservation created successfully");
    }

    /**
     * Check in to reservation (convert SCHEDULED -> ACTIVE)
     */
    @CacheEvict(value = {"reservations", "reservationStats"}, allEntries = true)
    public ReservationResponse checkIn(Long reservationId, String userEmail) {
        Reservation reservation = findAndValidateOwnership(reservationId, userEmail);
        LocalDateTime now = LocalDateTime.now();

        // Validate check-in window
        if (!reservation.canCheckIn(now)) {
            if (now.isBefore(reservation.getScheduledStartTime().minusMinutes(EARLY_CHECKIN_MINUTES))) {
                throw new IllegalStateException("Too early to check in. Check-in opens 15 minutes before scheduled time.");
            }
            if (reservation.isExpired(now)) {
                throw new IllegalStateException("Reservation has expired. Grace period exceeded.");
            }
            throw new IllegalStateException("Cannot check in to this reservation.");
        }

        // Activate spot in parking-lot-service
        activateReservedSpot(reservation.getSpotId(), reservationId);

        // Update reservation
        reservation.setStatus(ReservationStatus.ACTIVE);
        reservation.setActualEntryTime(now);
        reservation = reservationRepository.save(reservation);

        return buildResponse(reservation, "Check-in successful. Welcome!");
    }

    /**
     * Check out from reservation (convert ACTIVE -> COMPLETED)
     */
    @CacheEvict(value = {"reservations", "reservationStats"}, allEntries = true)
    public ReservationResponse checkOut(Long reservationId, String userEmail) {
        Reservation reservation = findAndValidateOwnership(reservationId, userEmail);

        if (reservation.getStatus() != ReservationStatus.ACTIVE) {
            throw new IllegalStateException("Reservation is not active. Cannot check out.");
        }

        LocalDateTime now = LocalDateTime.now();

        // Calculate actual fee (with overtime if applicable)
        BigDecimal actualFee = feeCalculator.calculateActualFee(
            reservation.getScheduledStartTime(),
            reservation.getScheduledEndTime(),
            reservation.getActualEntryTime(),
            now
        );

        // Process payment
        processPayment(reservation, actualFee);

        // Release spot
        releaseReservedSpot(reservation.getSpotId());

        // Update reservation
        reservation.setStatus(ReservationStatus.COMPLETED);
        reservation.setActualExitTime(now);
        reservation.setActualFee(actualFee);
        reservation.setPaymentStatus(PaymentStatus.PAID);
        reservation = reservationRepository.save(reservation);

        return buildResponse(reservation,
            String.format("Check-out successful. Fee charged: Rs.%.2f", actualFee));
    }

    /**
     * Cancel reservation
     */
    @CacheEvict(value = {"reservations", "reservationStats"}, allEntries = true)
    public ReservationResponse cancelReservation(Long reservationId, String userEmail, String reason) {
        Reservation reservation = findAndValidateOwnership(reservationId, userEmail);
        LocalDateTime now = LocalDateTime.now();

        if (!reservation.canCancel(now)) {
            throw new IllegalStateException(
                "Cannot cancel reservation within 30 minutes of scheduled start time.");
        }

        // Calculate refund (if prepaid)
        BigDecimal refundAmount = calculateRefund(reservation, now);

        // Release spot reservation
        releaseSpotReservation(reservation.getSpotId(), reservationId);

        // Update reservation
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancelledAt(now);
        reservation.setCancellationReason(reason);

        if (reservation.getPaymentStatus() == PaymentStatus.PREPAID && refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            processRefund(reservation, refundAmount);
            reservation.setPaymentStatus(
                refundAmount.compareTo(reservation.getEstimatedFee()) >= 0
                    ? PaymentStatus.REFUNDED
                    : PaymentStatus.PARTIAL_REFUND
            );
        }

        reservation = reservationRepository.save(reservation);

        return buildResponse(reservation,
            String.format("Reservation cancelled. Refund: Rs.%.2f", refundAmount));
    }

    /**
     * Check availability for a time slot
     */
    @Cacheable(value = "availability", key = "#request.levelId + '_' + #request.startTime + '_' + #request.durationMinutes")
    public AvailabilityResponse checkAvailability(CheckAvailabilityRequest request) {
        LocalDateTime endTime = request.getStartTime().plusMinutes(request.getDurationMinutes());

        // Call parking-lot-service to get available spots
        List<AvailableSpotDTO> availableSpots = getAvailableSpots(
            request.getLevelId(),
            request.getStartTime(),
            endTime,
            request.getIsAccessible()
        );

        return AvailabilityResponse.builder()
            .levelId(request.getLevelId())
            .requestedStartTime(request.getStartTime())
            .requestedEndTime(endTime)
            .availableSpots(availableSpots.size())
            .spots(availableSpots)
            .message(availableSpots.isEmpty()
                ? "No spots available for selected time slot"
                : availableSpots.size() + " spots available")
            .build();
    }

    // Private helper methods...

    private void validateCreateRequest(CreateReservationRequest request) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime maxFutureTime = now.plusDays(MAX_ADVANCE_DAYS);

        if (request.getScheduledStartTime().isBefore(now)) {
            throw new IllegalArgumentException("Scheduled time must be in the future");
        }
        if (request.getScheduledStartTime().isAfter(maxFutureTime)) {
            throw new IllegalArgumentException("Cannot book more than " + MAX_ADVANCE_DAYS + " days in advance");
        }
        if (request.getDurationMinutes() < MIN_DURATION_MINUTES) {
            throw new IllegalArgumentException("Minimum duration is " + MIN_DURATION_MINUTES + " minutes");
        }
        if (request.getDurationMinutes() > MAX_DURATION_MINUTES) {
            throw new IllegalArgumentException("Maximum duration is " + MAX_DURATION_MINUTES + " minutes (12 hours)");
        }
    }

    private void checkVehicleConflicts(String vehicleNumber, LocalDateTime start, LocalDateTime end) {
        List<Reservation> conflicts = reservationRepository
            .findConflictingReservations(vehicleNumber, start, end);
        if (!conflicts.isEmpty()) {
            throw new IllegalStateException(
                "Vehicle already has a reservation during this time period");
        }
    }

    // WebClient calls to parking-lot-service...
    private void reserveSpot(Long spotId, LocalDateTime start, LocalDateTime end) {
        // POST to parking-lot-service/parking/spots/{spotId}/reserve
    }

    private void activateReservedSpot(Long spotId, Long reservationId) {
        // PUT to parking-lot-service/parking/spots/{spotId}/activate-reservation
    }

    private void releaseReservedSpot(Long spotId) {
        // PUT to parking-lot-service/parking/spots/{spotId}/release-reservation
    }

    private List<AvailableSpotDTO> getAvailableSpots(Long levelId, LocalDateTime start,
                                                      LocalDateTime end, Boolean isAccessible) {
        // GET from parking-lot-service/parking/spots/available
    }
}
```

#### 3.5.2 SpotReservationService.java (parking-lot-service)

```java
@Service
@RequiredArgsConstructor
@Transactional
public class SpotReservationService {

    private final ParkingSpotRepository spotRepository;
    private final SpotReservationBlockRepository blockRepository;

    /**
     * Get available spots for a time range
     */
    public List<ParkingSpot> getAvailableSpotsForTimeRange(
            Long levelId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Boolean isAccessible) {

        // Get all spots in level that are not DISABLED
        List<ParkingSpot> allSpots = spotRepository.findByLevelIdAndStatusNot(
            levelId, SpotStatus.DISABLED);

        if (isAccessible != null && isAccessible) {
            allSpots = allSpots.stream()
                .filter(s -> s.getSpotType() == SpotType.HANDICAPPED)
                .collect(Collectors.toList());
        }

        // Filter out spots with conflicting reservations
        List<Long> blockedSpotIds = blockRepository
            .findBlockedSpotIds(levelId, startTime, endTime);

        // Filter out currently occupied spots (for immediate start times)
        if (startTime.isBefore(LocalDateTime.now().plusMinutes(15))) {
            List<Long> occupiedSpotIds = spotRepository
                .findOccupiedSpotIds(levelId);
            blockedSpotIds.addAll(occupiedSpotIds);
        }

        return allSpots.stream()
            .filter(spot -> !blockedSpotIds.contains(spot.getId()))
            .collect(Collectors.toList());
    }

    /**
     * Reserve a spot for a time range (with pessimistic locking)
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void reserveSpot(Long spotId, Long reservationId,
                           LocalDateTime startTime, LocalDateTime endTime) {

        // Acquire lock on spot
        ParkingSpot spot = spotRepository.findSpotForUpdate(spotId)
            .orElseThrow(() -> new IllegalArgumentException("Spot not found"));

        // Verify no conflicts exist
        boolean hasConflict = blockRepository.existsConflictingBlock(
            spotId, startTime, endTime);

        if (hasConflict) {
            throw new IllegalStateException("Spot is already reserved for this time period");
        }

        // Create reservation block
        SpotReservationBlock block = SpotReservationBlock.builder()
            .spotId(spotId)
            .reservationId(reservationId)
            .startTime(startTime)
            .endTime(endTime)
            .status(BlockStatus.BLOCKED)
            .build();

        blockRepository.save(block);

        // If reservation starts within 15 minutes, mark spot as RESERVED
        if (startTime.isBefore(LocalDateTime.now().plusMinutes(15))) {
            spot.setStatus(SpotStatus.RESERVED);
            spot.setCurrentReservationId(reservationId);
            spotRepository.save(spot);
        }
    }

    /**
     * Activate a reserved spot (RESERVED -> OCCUPIED)
     */
    @Transactional
    public void activateReservation(Long spotId, Long reservationId) {
        ParkingSpot spot = spotRepository.findSpotForUpdate(spotId)
            .orElseThrow(() -> new IllegalArgumentException("Spot not found"));

        if (spot.getStatus() != SpotStatus.RESERVED && spot.getStatus() != SpotStatus.AVAILABLE) {
            throw new IllegalStateException("Spot is not in valid state for activation");
        }

        spot.setStatus(SpotStatus.OCCUPIED);
        spot.setCurrentReservationId(reservationId);
        spotRepository.save(spot);
    }

    /**
     * Release a reservation (on cancellation or completion)
     */
    @Transactional
    public void releaseReservation(Long spotId, Long reservationId) {
        // Mark block as released
        blockRepository.releaseBlock(reservationId);

        // Update spot status
        ParkingSpot spot = spotRepository.findById(spotId)
            .orElseThrow(() -> new IllegalArgumentException("Spot not found"));

        if (spot.getCurrentReservationId() != null &&
            spot.getCurrentReservationId().equals(reservationId)) {
            spot.setStatus(SpotStatus.AVAILABLE);
            spot.setCurrentReservationId(null);
            spotRepository.save(spot);
        }
    }
}
```

### 3.6 Repository Queries

#### 3.6.1 ReservationRepository.java

```java
@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    // Find user's reservations
    List<Reservation> findByUserEmailOrderByScheduledStartTimeDesc(String userEmail);

    // Find user's active/scheduled reservations
    @Query("SELECT r FROM Reservation r WHERE r.userEmail = :email " +
           "AND r.status IN ('SCHEDULED', 'ACTIVE') " +
           "ORDER BY r.scheduledStartTime ASC")
    List<Reservation> findActiveReservationsByEmail(@Param("email") String email);

    // Find by ID and email (ownership validation)
    Optional<Reservation> findByIdAndUserEmail(Long id, String userEmail);

    // Find conflicting reservations for a vehicle
    @Query("SELECT r FROM Reservation r WHERE r.vehicleNumber = :vehicleNumber " +
           "AND r.status IN ('SCHEDULED', 'ACTIVE') " +
           "AND ((r.scheduledStartTime < :endTime AND r.scheduledEndTime > :startTime))")
    List<Reservation> findConflictingReservations(
        @Param("vehicleNumber") String vehicleNumber,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime);

    // Find expired reservations (for scheduler)
    @Query("SELECT r FROM Reservation r WHERE r.status = 'SCHEDULED' " +
           "AND r.scheduledStartTime < :graceLimit")
    List<Reservation> findExpiredReservations(@Param("graceLimit") LocalDateTime graceLimit);

    // Statistics queries
    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.status = :status")
    Long countByStatus(@Param("status") ReservationStatus status);

    @Query("SELECT SUM(r.actualFee) FROM Reservation r WHERE r.status = 'COMPLETED' " +
           "AND r.actualExitTime BETWEEN :start AND :end")
    BigDecimal sumRevenueBetween(@Param("start") LocalDateTime start,
                                  @Param("end") LocalDateTime end);
}
```

#### 3.6.2 SpotReservationBlockRepository.java

```java
@Repository
public interface SpotReservationBlockRepository extends JpaRepository<SpotReservationBlock, Long> {

    // Find blocked spot IDs for a time range
    @Query("SELECT DISTINCT b.spotId FROM SpotReservationBlock b " +
           "WHERE b.status = 'BLOCKED' " +
           "AND b.spotId IN (SELECT s.id FROM ParkingSpot s WHERE s.level.id = :levelId) " +
           "AND ((b.startTime < :endTime AND b.endTime > :startTime))")
    List<Long> findBlockedSpotIds(
        @Param("levelId") Long levelId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime);

    // Check for conflicts
    @Query("SELECT COUNT(b) > 0 FROM SpotReservationBlock b " +
           "WHERE b.spotId = :spotId AND b.status = 'BLOCKED' " +
           "AND ((b.startTime < :endTime AND b.endTime > :startTime))")
    boolean existsConflictingBlock(
        @Param("spotId") Long spotId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime);

    // Release block
    @Modifying
    @Query("UPDATE SpotReservationBlock b SET b.status = 'RELEASED' " +
           "WHERE b.reservationId = :reservationId")
    void releaseBlock(@Param("reservationId") Long reservationId);

    // Find blocks to clean up (for scheduler)
    @Query("SELECT b FROM SpotReservationBlock b WHERE b.status = 'BLOCKED' " +
           "AND b.endTime < :cutoff")
    List<SpotReservationBlock> findExpiredBlocks(@Param("cutoff") LocalDateTime cutoff);
}
```

### 3.7 Concurrency Handling

#### 3.7.1 Double-Booking Prevention

```java
/**
 * Reservation creation uses SERIALIZABLE isolation level
 * to prevent race conditions during spot reservation
 */
@Transactional(isolation = Isolation.SERIALIZABLE)
public ReservationResponse createReservation(CreateReservationRequest request) {
    // 1. Pessimistic lock on spot record
    ParkingSpot spot = spotRepository.findSpotForUpdate(request.getSpotId())
        .orElseThrow(() -> new IllegalArgumentException("Spot not found"));

    // 2. Check for existing blocks (double-check within transaction)
    boolean hasConflict = blockRepository.existsConflictingBlock(
        request.getSpotId(),
        request.getScheduledStartTime(),
        request.getScheduledStartTime().plusMinutes(request.getDurationMinutes())
    );

    if (hasConflict) {
        throw new ConflictException("Spot was reserved by another user. Please try again.");
    }

    // 3. Create block and reservation atomically
    // ... rest of creation logic
}
```

#### 3.7.2 Optimistic Locking with Version

```java
@Entity
public class Reservation {
    // Add version field for optimistic locking
    @Version
    private Long version;

    // ... other fields
}
```

---

## 4. Business Rules

### 4.1 Booking Rules

| Rule | Value | Configurable |
|------|-------|--------------|
| Maximum advance booking | 7 days | Yes |
| Minimum booking duration | 30 minutes | Yes |
| Maximum booking duration | 12 hours (720 min) | Yes |
| Booking time granularity | 30-minute slots | Yes |
| Max active reservations per vehicle | 1 | Yes |
| Max scheduled reservations per user | 5 | Yes |

### 4.2 Check-In Rules

| Rule | Value | Configurable |
|------|-------|--------------|
| Early check-in window | 15 minutes before start | Yes |
| Grace period after start time | 15 minutes | Yes |
| Auto-expiry after grace period | Immediate | Yes |

### 4.3 Fee Calculation

```java
@Component
public class FeeCalculator {

    private static final BigDecimal BASE_RATE_PER_HOUR = new BigDecimal("50.00");
    private static final BigDecimal OVERTIME_MULTIPLIER = new BigDecimal("1.5");
    private static final BigDecimal MINIMUM_FEE = new BigDecimal("50.00");

    /**
     * Calculate estimated fee for reservation
     */
    public BigDecimal calculateFee(int durationMinutes) {
        BigDecimal hours = new BigDecimal(durationMinutes).divide(new BigDecimal("60"), 2, RoundingMode.CEILING);
        BigDecimal fee = hours.multiply(BASE_RATE_PER_HOUR);
        return fee.max(MINIMUM_FEE);
    }

    /**
     * Calculate actual fee including overtime
     */
    public BigDecimal calculateActualFee(
            LocalDateTime scheduledStart,
            LocalDateTime scheduledEnd,
            LocalDateTime actualEntry,
            LocalDateTime actualExit) {

        // Base fee for scheduled duration
        long scheduledMinutes = Duration.between(scheduledStart, scheduledEnd).toMinutes();
        BigDecimal baseFee = calculateFee((int) scheduledMinutes);

        // Check for overtime
        if (actualExit.isAfter(scheduledEnd)) {
            long overtimeMinutes = Duration.between(scheduledEnd, actualExit).toMinutes();
            // Round up to nearest 30-minute block
            long overtimeBlocks = (overtimeMinutes + 29) / 30;
            BigDecimal overtimeFee = BASE_RATE_PER_HOUR
                .multiply(OVERTIME_MULTIPLIER)
                .multiply(new BigDecimal(overtimeBlocks))
                .divide(new BigDecimal("2"), 2, RoundingMode.CEILING);
            return baseFee.add(overtimeFee);
        }

        // No refund for early exit
        return baseFee;
    }
}
```

### 4.4 Cancellation Policy

| Time Before Start | Refund (if prepaid) | Action |
|-------------------|---------------------|--------|
| > 24 hours | 100% | Full refund |
| 2-24 hours | 50% | Partial refund |
| < 2 hours | 0% | No refund |
| < 30 minutes | N/A | Cannot cancel |

### 4.5 Auto-Expiry Rules

```java
/**
 * Scheduler runs every 5 minutes to expire no-show reservations
 */
@Scheduled(fixedRate = 300000) // 5 minutes
public void expireNoShowReservations() {
    LocalDateTime graceLimit = LocalDateTime.now().minusMinutes(15);

    List<Reservation> expired = reservationRepository.findExpiredReservations(graceLimit);

    for (Reservation reservation : expired) {
        // Release spot
        spotReservationService.releaseReservation(
            reservation.getSpotId(),
            reservation.getId()
        );

        // Update reservation status
        reservation.setStatus(ReservationStatus.NO_SHOW);
        reservationRepository.save(reservation);

        // Notify user (optional)
        notificationService.sendNoShowNotification(reservation);

        log.info("Expired reservation {} for vehicle {}",
            reservation.getId(), reservation.getVehicleNumber());
    }
}
```

---

## 5. Frontend Changes

### 5.1 New Components Required

#### 5.1.1 Component Hierarchy

```
src/pages/
├── scheduling/
│   ├── ScheduleParking.js          # Main scheduling page
│   ├── DateTimePicker.js           # Date and time selection
│   ├── AvailabilityGrid.js         # Available spots display
│   ├── ReservationSummary.js       # Booking summary before confirm
│   ├── ReservationConfirmation.js  # Success page
│   └── MyReservations.js           # User's reservations list
│
├── components/
│   ├── TimeSlotPicker.js           # 30-min slot selector
│   ├── DurationSelector.js         # Duration dropdown/slider
│   ├── SpotCard.js                 # Individual spot display
│   └── ReservationCard.js          # Reservation list item
```

#### 5.1.2 ScheduleParking.js (Main Page)

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getLevelsWithDetails } from '../../api/parkingLotService';
import { checkAvailability, createReservation } from '../../api/reservationService';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';
import DateTimePicker from './DateTimePicker';
import DurationSelector from './DurationSelector';
import AvailabilityGrid from './AvailabilityGrid';
import ReservationSummary from './ReservationSummary';

export default function ScheduleParking() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [duration, setDuration] = useState(60); // Default 1 hour
  const [levelId, setLevelId] = useState(null);
  const [spotId, setSpotId] = useState(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [isAccessible, setIsAccessible] = useState(false);

  // Data state
  const [levels, setLevels] = useState([]);
  const [availableSpots, setAvailableSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);

  // UI state
  const [step, setStep] = useState(1); // 1: DateTime, 2: Level/Spot, 3: Confirm
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load levels on mount
  useEffect(() => {
    getLevelsWithDetails()
      .then(res => setLevels(res.data || []))
      .catch(err => setError(err));
  }, []);

  // Check availability when date/time/level/duration changes
  const handleCheckAvailability = useCallback(async () => {
    if (!selectedDate || !selectedTime || !levelId || !duration) return;

    setCheckingAvailability(true);
    setError(null);

    try {
      const startTime = combineDateTime(selectedDate, selectedTime);
      const response = await checkAvailability({
        levelId,
        startTime: startTime.toISOString(),
        durationMinutes: duration,
        isAccessible
      });

      setAvailableSpots(response.data.spots || []);
      if (response.data.spots.length === 0) {
        setError({ message: 'No spots available for selected time slot. Try a different time or level.' });
      }
    } catch (err) {
      setError(err);
      setAvailableSpots([]);
    } finally {
      setCheckingAvailability(false);
    }
  }, [selectedDate, selectedTime, levelId, duration, isAccessible]);

  // Create reservation
  const handleCreateReservation = async () => {
    if (!selectedSpot || !vehicleNumber) {
      setError({ message: 'Please select a spot and enter vehicle number' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startTime = combineDateTime(selectedDate, selectedTime);

      const response = await createReservation({
        userId: user.id,
        userEmail: user.email,
        vehicleNumber: vehicleNumber.toUpperCase(),
        spotId: selectedSpot.spotId,
        levelId,
        scheduledStartTime: startTime.toISOString(),
        durationMinutes: duration,
        isAccessible
      });

      setSuccess(response.data);
      // Navigate to confirmation after 2 seconds
      setTimeout(() => {
        navigate('/reservations/' + response.data.id);
      }, 2000);

    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to combine date and time
  const combineDateTime = (date, time) => {
    const [hours, minutes] = time.split(':');
    const combined = new Date(date);
    combined.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return combined;
  };

  return (
    <div className="container mt-4">
      <h4 className="mb-4">Schedule Parking</h4>

      {/* Progress Steps */}
      <div className="mb-4">
        <div className="d-flex justify-content-between">
          <StepIndicator step={1} current={step} label="Date & Time" />
          <StepIndicator step={2} current={step} label="Select Spot" />
          <StepIndicator step={3} current={step} label="Confirm" />
        </div>
      </div>

      {error && <ErrorMessage error={error} onRetry={() => setError(null)} />}
      {success && (
        <div className="alert alert-success">
          Reservation created successfully! Redirecting...
        </div>
      )}

      {/* Step 1: Date & Time Selection */}
      {step === 1 && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title mb-4">Select Date & Time</h5>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Date</label>
                <DateTimePicker
                  selected={selectedDate}
                  onChange={setSelectedDate}
                  minDate={new Date()}
                  maxDate={addDays(new Date(), 7)}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Start Time</label>
                <TimeSlotPicker
                  selected={selectedTime}
                  onChange={setSelectedTime}
                  date={selectedDate}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Duration</label>
                <DurationSelector
                  value={duration}
                  onChange={setDuration}
                  min={30}
                  max={720}
                  step={30}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Level</label>
                <select
                  className="form-select"
                  value={levelId || ''}
                  onChange={(e) => setLevelId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select a level</option>
                  {levels.map(level => (
                    <option key={level.id} value={level.id}>
                      {level.name} ({level.availableSpots} available)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-check mb-3">
              <input
                type="checkbox"
                className="form-check-input"
                id="accessible"
                checked={isAccessible}
                onChange={(e) => setIsAccessible(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="accessible">
                I need an accessible parking spot
              </label>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => { handleCheckAvailability(); setStep(2); }}
              disabled={!selectedDate || !selectedTime || !levelId}
            >
              Check Availability
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Spot Selection */}
      {step === 2 && (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="card-title mb-0">Select Parking Spot</h5>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setStep(1)}
              >
                <i className="bi bi-arrow-left me-1"></i> Back
              </button>
            </div>

            {checkingAvailability ? (
              <Loading text="Checking availability..." />
            ) : (
              <>
                <AvailabilityGrid
                  spots={availableSpots}
                  selectedSpot={selectedSpot}
                  onSelectSpot={setSelectedSpot}
                />

                {selectedSpot && (
                  <div className="mt-4">
                    <label className="form-label">Vehicle Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      placeholder="Enter vehicle number"
                      maxLength={15}
                    />
                  </div>
                )}

                <div className="mt-4">
                  <button
                    className="btn btn-primary"
                    onClick={() => setStep(3)}
                    disabled={!selectedSpot || !vehicleNumber}
                  >
                    Continue to Summary
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="card-title mb-0">Confirm Reservation</h5>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setStep(2)}
              >
                <i className="bi bi-arrow-left me-1"></i> Back
              </button>
            </div>

            <ReservationSummary
              date={selectedDate}
              time={selectedTime}
              duration={duration}
              spot={selectedSpot}
              levelName={levels.find(l => l.id === levelId)?.name}
              vehicleNumber={vehicleNumber}
            />

            <div className="mt-4">
              <button
                className="btn btn-success btn-lg w-100"
                onClick={handleCreateReservation}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Creating Reservation...
                  </>
                ) : (
                  'Confirm Reservation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 5.1.3 MyReservations.js

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserReservations, cancelReservation, checkIn } from '../../api/reservationService';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';
import ReservationCard from './ReservationCard';

export default function MyReservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, scheduled, active, completed

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getUserReservations(user.email);
      setReservations(response.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleCancel = async (reservationId, reason) => {
    try {
      await cancelReservation(reservationId, user.email, reason);
      fetchReservations(); // Refresh list
    } catch (err) {
      setError(err);
    }
  };

  const handleCheckIn = async (reservationId) => {
    try {
      await checkIn(reservationId, user.email);
      fetchReservations(); // Refresh list
    } catch (err) {
      setError(err);
    }
  };

  const filteredReservations = reservations.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return ['SCHEDULED'].includes(r.status);
    if (filter === 'active') return ['ACTIVE'].includes(r.status);
    if (filter === 'past') return ['COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_SHOW'].includes(r.status);
    return true;
  });

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>My Reservations</h4>
        <Link to="/schedule-parking" className="btn btn-primary">
          <i className="bi bi-plus-circle me-2"></i>
          New Reservation
        </Link>
      </div>

      {/* Filter Tabs */}
      <ul className="nav nav-tabs mb-4">
        {['all', 'upcoming', 'active', 'past'].map(f => (
          <li className="nav-item" key={f}>
            <button
              className={`nav-link ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          </li>
        ))}
      </ul>

      {loading && <Loading text="Loading reservations..." />}

      {error && <ErrorMessage error={error} onRetry={fetchReservations} />}

      {!loading && !error && filteredReservations.length === 0 && (
        <div className="alert alert-info">
          <h5>No Reservations Found</h5>
          <p>You don't have any {filter !== 'all' ? filter : ''} reservations yet.</p>
          <Link to="/schedule-parking" className="btn btn-primary">
            Schedule Your First Parking
          </Link>
        </div>
      )}

      {!loading && !error && filteredReservations.length > 0 && (
        <div className="row">
          {filteredReservations.map(reservation => (
            <div className="col-md-6 mb-3" key={reservation.id}>
              <ReservationCard
                reservation={reservation}
                onCancel={handleCancel}
                onCheckIn={handleCheckIn}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 5.2 API Service (reservationService.js)

```javascript
import api from './axiosConfig';

// Create a new reservation
export const createReservation = (data) =>
  api.post('/reservations/create', data);

// Check availability for a time slot
export const checkAvailability = (params) =>
  api.get('/reservations/availability', { params });

// Get user's reservations
export const getUserReservations = (email) =>
  api.get('/reservations/user', { params: { email } });

// Get user's active/scheduled reservations
export const getUserActiveReservations = (email) =>
  api.get('/reservations/user/active', { params: { email } });

// Get specific reservation
export const getReservation = (id, email) =>
  api.get(`/reservations/${id}`, { params: { email } });

// Check in to reservation
export const checkIn = (id, email) =>
  api.put(`/reservations/${id}/check-in`, null, { params: { email } });

// Check out from reservation
export const checkOut = (id, email) =>
  api.put(`/reservations/${id}/check-out`, null, { params: { email } });

// Cancel reservation
export const cancelReservation = (id, email, reason = '') =>
  api.put(`/reservations/${id}/cancel`, { cancellationReason: reason }, { params: { email } });

// Modify reservation
export const modifyReservation = (id, email, modifications) =>
  api.put(`/reservations/${id}/modify`, modifications, { params: { email } });

// Admin: Get all reservations
export const getAllReservations = () =>
  api.get('/reservations/admin/all');

// Admin: Get reservation statistics
export const getReservationStats = () =>
  api.get('/reservations/admin/stats');
```

### 5.3 Route Configuration Updates (App.js)

```jsx
// Add new imports
import ScheduleParking from './pages/scheduling/ScheduleParking';
import MyReservations from './pages/scheduling/MyReservations';
import ReservationDetails from './pages/scheduling/ReservationDetails';

// Add new routes in AppRoutes component
<Route path="/schedule-parking" element={
  <UserRoute>
    <AuthenticatedLayout><ScheduleParking /></AuthenticatedLayout>
  </UserRoute>
} />

<Route path="/reservations" element={
  <UserRoute>
    <AuthenticatedLayout><MyReservations /></AuthenticatedLayout>
  </UserRoute>
} />

<Route path="/reservations/:id" element={
  <UserRoute>
    <AuthenticatedLayout><ReservationDetails /></AuthenticatedLayout>
  </UserRoute>
} />
```

### 5.4 Navigation Updates (NavBar.js)

```jsx
// Add to user menu items
{!admin && (
  <>
    <li className="nav-item">
      <Link className={'nav-link ' + isActive('/schedule-parking')} to="/schedule-parking">
        Schedule Parking
      </Link>
    </li>
    <li className="nav-item">
      <Link className={'nav-link ' + isActive('/reservations')} to="/reservations">
        My Reservations
      </Link>
    </li>
    {/* ... existing items */}
  </>
)}
```

### 5.5 Dashboard Updates (Dashboard.js)

```jsx
// Add new Quick Action card for scheduling
<div className="col-md-4 mb-3">
  <div className="card border-0 shadow-sm h-100">
    <div className="card-body text-center py-4">
      <div className="bg-warning bg-opacity-10 d-inline-block p-3 rounded-circle mb-3">
        <i className="bi bi-calendar-check text-warning fs-3"></i>
      </div>
      <h5>Schedule Parking</h5>
      <p className="text-muted small">Reserve a spot in advance</p>
      <Link to="/schedule-parking" className="btn btn-warning text-white">
        Schedule Now
      </Link>
    </div>
  </div>
</div>

// Add upcoming reservations section
{upcomingReservations.length > 0 && (
  <div className="row mb-4">
    <div className="col-12">
      <h5 className="mb-3">Upcoming Reservations</h5>
      <div className="list-group">
        {upcomingReservations.slice(0, 3).map(res => (
          <Link
            key={res.id}
            to={`/reservations/${res.id}`}
            className="list-group-item list-group-item-action"
          >
            <div className="d-flex justify-content-between">
              <div>
                <strong>{res.spotCode}</strong> - {res.levelName}
              </div>
              <div>
                {formatDateTime(res.scheduledStartTime)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </div>
)}
```

---

## 6. System Enhancements

### 6.1 Locking Strategy

#### 6.1.1 Database-Level Locking

```java
// Pessimistic locking for spot reservation
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT s FROM ParkingSpot s WHERE s.id = :spotId")
Optional<ParkingSpot> findSpotForUpdate(@Param("spotId") Long spotId);

// Row-level locking with timeout
@QueryHints({
    @QueryHint(name = "javax.persistence.lock.timeout", value = "3000")
})
@Lock(LockModeType.PESSIMISTIC_WRITE)
Optional<ParkingSpot> findByIdWithLock(Long id);
```

#### 6.1.2 Application-Level Locking

```java
@Service
public class SpotLockService {

    private final ConcurrentHashMap<Long, ReentrantLock> spotLocks = new ConcurrentHashMap<>();

    public void withSpotLock(Long spotId, Runnable action) {
        ReentrantLock lock = spotLocks.computeIfAbsent(spotId, k -> new ReentrantLock());

        boolean acquired = false;
        try {
            acquired = lock.tryLock(5, TimeUnit.SECONDS);
            if (!acquired) {
                throw new IllegalStateException("Could not acquire lock for spot " + spotId);
            }
            action.run();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Lock acquisition interrupted");
        } finally {
            if (acquired) {
                lock.unlock();
            }
        }
    }
}
```

### 6.2 Scheduler Jobs

#### 6.2.1 ReservationScheduler.java

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class ReservationScheduler {

    private final ReservationRepository reservationRepository;
    private final SpotReservationService spotReservationService;
    private final NotificationService notificationService;

    /**
     * Expire no-show reservations (runs every 5 minutes)
     */
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void expireNoShowReservations() {
        log.info("Running no-show expiration job");

        LocalDateTime graceLimit = LocalDateTime.now().minusMinutes(15);
        List<Reservation> expired = reservationRepository.findExpiredReservations(graceLimit);

        for (Reservation reservation : expired) {
            try {
                // Release spot
                spotReservationService.releaseReservation(
                    reservation.getSpotId(),
                    reservation.getId()
                );

                // Update status
                reservation.setStatus(ReservationStatus.NO_SHOW);
                reservationRepository.save(reservation);

                // Notify user
                notificationService.sendNoShowNotification(reservation);

                log.info("Expired reservation {} for vehicle {}",
                    reservation.getId(), reservation.getVehicleNumber());
            } catch (Exception e) {
                log.error("Failed to expire reservation {}: {}",
                    reservation.getId(), e.getMessage());
            }
        }

        log.info("Expired {} no-show reservations", expired.size());
    }

    /**
     * Send reminder notifications (runs every 15 minutes)
     */
    @Scheduled(fixedRate = 900000)
    public void sendReminderNotifications() {
        log.info("Running reminder notification job");

        // Find reservations starting in 30-45 minutes
        LocalDateTime from = LocalDateTime.now().plusMinutes(30);
        LocalDateTime to = LocalDateTime.now().plusMinutes(45);

        List<Reservation> upcoming = reservationRepository
            .findByStatusAndScheduledStartTimeBetween(
                ReservationStatus.SCHEDULED, from, to);

        for (Reservation reservation : upcoming) {
            try {
                notificationService.sendReminderNotification(reservation);
            } catch (Exception e) {
                log.error("Failed to send reminder for reservation {}: {}",
                    reservation.getId(), e.getMessage());
            }
        }
    }

    /**
     * Clean up old reservation blocks (runs daily at 3 AM)
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredBlocks() {
        log.info("Running reservation block cleanup job");

        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        int deleted = blockRepository.deleteExpiredBlocks(cutoff);

        log.info("Cleaned up {} expired reservation blocks", deleted);
    }

    /**
     * Update spot status for imminent reservations (runs every minute)
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void updateImminentReservations() {
        // Find reservations starting in next 15 minutes
        LocalDateTime limit = LocalDateTime.now().plusMinutes(15);

        List<Reservation> imminent = reservationRepository
            .findByStatusAndScheduledStartTimeBefore(
                ReservationStatus.SCHEDULED, limit);

        for (Reservation reservation : imminent) {
            try {
                // Mark spot as RESERVED if not already
                spotReservationService.markSpotReserved(
                    reservation.getSpotId(),
                    reservation.getId()
                );
            } catch (Exception e) {
                log.error("Failed to mark spot reserved for reservation {}: {}",
                    reservation.getId(), e.getMessage());
            }
        }
    }
}
```

### 6.3 Notification Service

```java
@Service
@RequiredArgsConstructor
public class ReservationNotificationService {

    private final FCMService fcmService;
    private final EmailService emailService;

    public void sendConfirmationNotification(Reservation reservation) {
        String title = "Reservation Confirmed";
        String body = String.format(
            "Your parking reservation for %s at %s is confirmed. " +
            "Spot: %s, Time: %s",
            reservation.getVehicleNumber(),
            reservation.getLevelId(),
            reservation.getSpotId(),
            formatDateTime(reservation.getScheduledStartTime())
        );

        sendNotification(reservation.getUserEmail(), title, body);
    }

    public void sendReminderNotification(Reservation reservation) {
        String title = "Parking Reminder";
        String body = String.format(
            "Your parking reservation starts in 30 minutes. " +
            "Spot: %s. Don't forget to check in!",
            reservation.getSpotId()
        );

        sendNotification(reservation.getUserEmail(), title, body);
    }

    public void sendNoShowNotification(Reservation reservation) {
        String title = "Reservation Expired";
        String body = String.format(
            "Your parking reservation for %s has expired due to no-show. " +
            "The spot has been released.",
            reservation.getVehicleNumber()
        );

        sendNotification(reservation.getUserEmail(), title, body);
    }

    public void sendCheckInConfirmation(Reservation reservation) {
        String title = "Check-In Successful";
        String body = String.format(
            "You've checked in to spot %s. Your reservation ends at %s. " +
            "Have a great day!",
            reservation.getSpotId(),
            formatDateTime(reservation.getScheduledEndTime())
        );

        sendNotification(reservation.getUserEmail(), title, body);
    }

    private void sendNotification(String email, String title, String body) {
        // Send push notification
        fcmService.sendToUser(email, title, body);

        // Also send email
        emailService.sendEmail(email, title, body);
    }
}
```

---

## 7. Edge Cases

### 7.1 Multiple Users Attempting Same Slot

**Scenario:** Two users click "Reserve" for the same spot at the same time.

**Solution:**
```java
@Transactional(isolation = Isolation.SERIALIZABLE)
public ReservationResponse createReservation(CreateReservationRequest request) {
    // Database-level pessimistic lock
    ParkingSpot spot = spotRepository.findSpotForUpdate(request.getSpotId())
        .orElseThrow(() -> new NotFoundException("Spot not found"));

    // Double-check for conflicts (within transaction)
    if (blockRepository.existsConflictingBlock(
            request.getSpotId(),
            request.getScheduledStartTime(),
            request.getScheduledEndTime())) {
        throw new ConflictException(
            "This spot was just reserved by another user. Please select a different spot.");
    }

    // Proceed with reservation...
}
```

**Error Response:**
```json
{
  "status": 409,
  "error": "Conflict",
  "message": "This spot was just reserved by another user. Please select a different spot.",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 7.2 System Restart During Active Reservations

**Scenario:** Server restarts while users have active reservations.

**Solution:**
1. **Startup Recovery Job:**
```java
@Component
@RequiredArgsConstructor
public class ReservationRecoveryService {

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void recoverReservationsOnStartup() {
        log.info("Running reservation recovery on startup");

        // 1. Find all SCHEDULED reservations that should have expired
        LocalDateTime now = LocalDateTime.now();
        List<Reservation> expiredScheduled = reservationRepository
            .findByStatusAndScheduledStartTimePlusBefore(
                ReservationStatus.SCHEDULED,
                now.minusMinutes(15)
            );

        for (Reservation r : expiredScheduled) {
            r.setStatus(ReservationStatus.NO_SHOW);
            reservationRepository.save(r);
            spotReservationService.releaseReservation(r.getSpotId(), r.getId());
        }

        // 2. Sync spot status with reservation blocks
        syncSpotStatusWithReservations();

        log.info("Recovery complete. Processed {} expired reservations",
            expiredScheduled.size());
    }

    private void syncSpotStatusWithReservations() {
        // Ensure spot status matches current reservations
        List<SpotReservationBlock> activeBlocks = blockRepository
            .findActiveBlocksAtTime(LocalDateTime.now());

        for (SpotReservationBlock block : activeBlocks) {
            ParkingSpot spot = spotRepository.findById(block.getSpotId()).orElse(null);
            if (spot != null && spot.getStatus() == SpotStatus.AVAILABLE) {
                spot.setStatus(SpotStatus.RESERVED);
                spot.setCurrentReservationId(block.getReservationId());
                spotRepository.save(spot);
            }
        }
    }
}
```

### 7.3 Timezone Handling

**Scenario:** User books from different timezone than server.

**Solution:**
```java
// All times stored in UTC
@Column(nullable = false)
private LocalDateTime scheduledStartTime; // Always UTC

// DTO includes timezone info
@Data
public class CreateReservationRequest {
    private String scheduledStartTimeUtc; // ISO-8601 with timezone
    private String userTimezone; // e.g., "Asia/Kolkata"
}

// Service converts to UTC
public ReservationResponse createReservation(CreateReservationRequest request) {
    ZonedDateTime userTime = ZonedDateTime.parse(request.getScheduledStartTimeUtc());
    LocalDateTime utcTime = userTime.withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();

    // Store UTC time
    reservation.setScheduledStartTime(utcTime);
}

// Response converts back to user timezone
public ReservationResponse buildResponse(Reservation reservation, String userTimezone) {
    ZoneId zone = ZoneId.of(userTimezone);
    ZonedDateTime localTime = reservation.getScheduledStartTime()
        .atZone(ZoneOffset.UTC)
        .withZoneSameInstant(zone);

    return ReservationResponse.builder()
        .scheduledStartTimeLocal(localTime.toString())
        .scheduledStartTimeUtc(reservation.getScheduledStartTime().toString())
        .build();
}
```

### 7.4 Overlapping Reservation Extension

**Scenario:** User tries to extend reservation but next slot is booked.

**Solution:**
```java
public ReservationResponse extendReservation(Long reservationId, int additionalMinutes) {
    Reservation reservation = findReservation(reservationId);

    LocalDateTime newEndTime = reservation.getScheduledEndTime()
        .plusMinutes(additionalMinutes);

    // Check for conflicts with new end time
    boolean hasConflict = blockRepository.existsConflictingBlockExcluding(
        reservation.getSpotId(),
        reservation.getScheduledEndTime(),
        newEndTime,
        reservation.getId() // Exclude current reservation
    );

    if (hasConflict) {
        // Find maximum extension possible
        LocalDateTime maxExtension = blockRepository.findNextBlockStart(
            reservation.getSpotId(),
            reservation.getScheduledEndTime()
        );

        throw new ConflictException(String.format(
            "Cannot extend by %d minutes. Maximum extension available: %d minutes",
            additionalMinutes,
            Duration.between(reservation.getScheduledEndTime(), maxExtension).toMinutes()
        ));
    }

    // Proceed with extension...
}
```

### 7.5 Payment Failure During Check-Out

**Scenario:** Payment service fails when user tries to check out.

**Solution:**
```java
public ReservationResponse checkOut(Long reservationId, String userEmail) {
    Reservation reservation = findAndValidateOwnership(reservationId, userEmail);

    // Calculate fee first
    BigDecimal fee = feeCalculator.calculateActualFee(...);

    // Attempt payment with retry
    PaymentResult result = null;
    int retries = 3;

    while (retries > 0) {
        try {
            result = paymentService.processPayment(
                reservation.getId(),
                reservation.getVehicleNumber(),
                fee
            );
            break;
        } catch (PaymentException e) {
            retries--;
            if (retries == 0) {
                // Log for manual processing
                auditService.logPaymentFailure(reservation, fee, e);

                // Still release spot but mark payment as pending
                reservation.setPaymentStatus(PaymentStatus.PAYMENT_FAILED);
                reservation.setActualFee(fee);
                spotReservationService.releaseReservation(reservation.getSpotId(), reservationId);
                reservation.setStatus(ReservationStatus.COMPLETED);
                reservation.setActualExitTime(LocalDateTime.now());

                return buildResponse(reservation,
                    "Check-out complete. Payment processing failed - you will be contacted for payment.");
            }
            Thread.sleep(1000); // Wait before retry
        }
    }

    // Normal completion...
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

#### 8.1.1 ReservationServiceTest.java

```java
@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock private ReservationRepository reservationRepository;
    @Mock private SpotReservationService spotReservationService;
    @Mock private FeeCalculator feeCalculator;

    @InjectMocks private ReservationService reservationService;

    @Test
    void createReservation_Success() {
        // Given
        CreateReservationRequest request = CreateReservationRequest.builder()
            .userId("user123")
            .userEmail("user@test.com")
            .vehicleNumber("ABC123")
            .spotId(1L)
            .levelId(1L)
            .scheduledStartTime(LocalDateTime.now().plusHours(2))
            .durationMinutes(60)
            .build();

        when(reservationRepository.findConflictingReservations(any(), any(), any()))
            .thenReturn(Collections.emptyList());
        when(feeCalculator.calculateFee(60)).thenReturn(new BigDecimal("50.00"));
        when(reservationRepository.save(any())).thenAnswer(i -> {
            Reservation r = i.getArgument(0);
            r.setId(1L);
            return r;
        });

        // When
        ReservationResponse response = reservationService.createReservation(request);

        // Then
        assertNotNull(response);
        assertEquals(1L, response.getId());
        assertEquals("SCHEDULED", response.getStatus());
        verify(spotReservationService).reserveSpot(eq(1L), any(), any());
    }

    @Test
    void createReservation_VehicleConflict_ThrowsException() {
        // Given
        CreateReservationRequest request = createValidRequest();

        when(reservationRepository.findConflictingReservations(any(), any(), any()))
            .thenReturn(List.of(new Reservation()));

        // When/Then
        assertThrows(IllegalStateException.class,
            () -> reservationService.createReservation(request));
    }

    @Test
    void checkIn_TooEarly_ThrowsException() {
        // Given
        Reservation reservation = Reservation.builder()
            .id(1L)
            .userEmail("user@test.com")
            .status(ReservationStatus.SCHEDULED)
            .scheduledStartTime(LocalDateTime.now().plusHours(2)) // 2 hours in future
            .build();

        when(reservationRepository.findByIdAndUserEmail(1L, "user@test.com"))
            .thenReturn(Optional.of(reservation));

        // When/Then
        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> reservationService.checkIn(1L, "user@test.com"));
        assertTrue(ex.getMessage().contains("Too early"));
    }

    @Test
    void checkIn_GracePeriodExpired_ThrowsException() {
        // Given
        Reservation reservation = Reservation.builder()
            .id(1L)
            .userEmail("user@test.com")
            .status(ReservationStatus.SCHEDULED)
            .scheduledStartTime(LocalDateTime.now().minusMinutes(20)) // 20 min ago
            .build();

        when(reservationRepository.findByIdAndUserEmail(1L, "user@test.com"))
            .thenReturn(Optional.of(reservation));

        // When/Then
        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> reservationService.checkIn(1L, "user@test.com"));
        assertTrue(ex.getMessage().contains("expired"));
    }

    @Test
    void cancelReservation_Within30Minutes_ThrowsException() {
        // Given
        Reservation reservation = Reservation.builder()
            .id(1L)
            .userEmail("user@test.com")
            .status(ReservationStatus.SCHEDULED)
            .scheduledStartTime(LocalDateTime.now().plusMinutes(15)) // 15 min in future
            .build();

        when(reservationRepository.findByIdAndUserEmail(1L, "user@test.com"))
            .thenReturn(Optional.of(reservation));

        // When/Then
        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> reservationService.cancelReservation(1L, "user@test.com", "reason"));
        assertTrue(ex.getMessage().contains("Cannot cancel"));
    }
}
```

#### 8.1.2 FeeCalculatorTest.java

```java
class FeeCalculatorTest {

    private FeeCalculator feeCalculator = new FeeCalculator();

    @Test
    void calculateFee_MinimumDuration_ReturnsMinimumFee() {
        BigDecimal fee = feeCalculator.calculateFee(30);
        assertEquals(new BigDecimal("50.00"), fee);
    }

    @Test
    void calculateFee_OneHour_Returns50() {
        BigDecimal fee = feeCalculator.calculateFee(60);
        assertEquals(new BigDecimal("50.00"), fee);
    }

    @Test
    void calculateFee_TwoHours_Returns100() {
        BigDecimal fee = feeCalculator.calculateFee(120);
        assertEquals(new BigDecimal("100.00"), fee);
    }

    @Test
    void calculateActualFee_EarlyExit_NoRefund() {
        LocalDateTime scheduledStart = LocalDateTime.now();
        LocalDateTime scheduledEnd = scheduledStart.plusHours(2);
        LocalDateTime actualEntry = scheduledStart;
        LocalDateTime actualExit = scheduledStart.plusHours(1); // Exit 1 hour early

        BigDecimal fee = feeCalculator.calculateActualFee(
            scheduledStart, scheduledEnd, actualEntry, actualExit);

        // Still charged for full 2 hours
        assertEquals(new BigDecimal("100.00"), fee);
    }

    @Test
    void calculateActualFee_Overtime_ChargesExtra() {
        LocalDateTime scheduledStart = LocalDateTime.now();
        LocalDateTime scheduledEnd = scheduledStart.plusHours(1);
        LocalDateTime actualEntry = scheduledStart;
        LocalDateTime actualExit = scheduledEnd.plusMinutes(45); // 45 min overtime

        BigDecimal fee = feeCalculator.calculateActualFee(
            scheduledStart, scheduledEnd, actualEntry, actualExit);

        // Base: Rs.50 + Overtime: 2 blocks * Rs.75/block = Rs.50 + Rs.75 = Rs.125
        assertEquals(new BigDecimal("125.00"), fee);
    }
}
```

### 8.2 Integration Tests

#### 8.2.1 ReservationIntegrationTest.java

```java
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReservationIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void createReservation_ValidRequest_Returns201() throws Exception {
        CreateReservationRequest request = CreateReservationRequest.builder()
            .userId("user123")
            .userEmail("user@test.com")
            .vehicleNumber("ABC123")
            .spotId(1L)
            .levelId(1L)
            .scheduledStartTime(LocalDateTime.now().plusHours(2))
            .durationMinutes(60)
            .build();

        mockMvc.perform(post("/reservations/create")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNumber())
            .andExpect(jsonPath("$.status").value("SCHEDULED"))
            .andExpect(jsonPath("$.vehicleNumber").value("ABC123"));
    }

    @Test
    void checkIn_WithinWindow_Returns200() throws Exception {
        // Create reservation starting now
        Reservation reservation = createTestReservation(LocalDateTime.now());

        mockMvc.perform(put("/reservations/{id}/check-in", reservation.getId())
                .param("email", "user@test.com"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void checkAvailability_ReturnsAvailableSpots() throws Exception {
        LocalDateTime startTime = LocalDateTime.now().plusHours(1);

        mockMvc.perform(get("/reservations/availability")
                .param("levelId", "1")
                .param("startTime", startTime.toString())
                .param("durationMinutes", "60"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.spots").isArray());
    }
}
```

### 8.3 Edge Case Scenarios

```java
@Test
void concurrentReservation_OnlyOneSucceeds() throws Exception {
    // Simulate two concurrent reservation requests for same spot
    ExecutorService executor = Executors.newFixedThreadPool(2);
    CountDownLatch latch = new CountDownLatch(1);
    AtomicInteger successCount = new AtomicInteger(0);
    AtomicInteger conflictCount = new AtomicInteger(0);

    Runnable reservationTask = () -> {
        try {
            latch.await(); // Wait for signal
            reservationService.createReservation(createRequest());
            successCount.incrementAndGet();
        } catch (ConflictException e) {
            conflictCount.incrementAndGet();
        } catch (Exception e) {
            // Other exceptions
        }
    };

    executor.submit(reservationTask);
    executor.submit(reservationTask);

    latch.countDown(); // Start both tasks
    executor.shutdown();
    executor.awaitTermination(10, TimeUnit.SECONDS);

    assertEquals(1, successCount.get());
    assertEquals(1, conflictCount.get());
}

@Test
void reservationExpiryJob_ExpiresNoShows() {
    // Create reservation that started 20 minutes ago
    Reservation noShow = createTestReservation(
        LocalDateTime.now().minusMinutes(20));

    // Run expiry job
    reservationScheduler.expireNoShowReservations();

    // Verify status changed
    Reservation updated = reservationRepository.findById(noShow.getId()).orElseThrow();
    assertEquals(ReservationStatus.NO_SHOW, updated.getStatus());
}
```

---

## 9. Deliverables

### 9.1 API Contracts

#### 9.1.1 Create Reservation

**Request:**
```http
POST /api/reservations/create
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user_123",
  "userEmail": "john@example.com",
  "vehicleNumber": "KA01AB1234",
  "spotId": 15,
  "levelId": 2,
  "scheduledStartTime": "2024-01-20T10:00:00Z",
  "durationMinutes": 120,
  "isAccessible": false
}
```

**Response (201 Created):**
```json
{
  "id": 1001,
  "userId": "user_123",
  "userEmail": "john@example.com",
  "vehicleNumber": "KA01AB1234",
  "spotId": 15,
  "spotCode": "B-15",
  "levelId": 2,
  "levelName": "Level 2",
  "scheduledStartTime": "2024-01-20T10:00:00Z",
  "scheduledEndTime": "2024-01-20T12:00:00Z",
  "durationMinutes": 120,
  "status": "SCHEDULED",
  "estimatedFee": 100.00,
  "paymentStatus": "PENDING",
  "createdAt": "2024-01-15T14:30:00Z",
  "canCheckIn": false,
  "canCancel": true,
  "canModify": true,
  "minutesUntilStart": 7170,
  "message": "Reservation created successfully"
}
```

#### 9.1.2 Check Availability

**Request:**
```http
GET /api/reservations/availability?levelId=2&startTime=2024-01-20T10:00:00Z&durationMinutes=120&isAccessible=false
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "levelId": 2,
  "levelName": "Level 2",
  "requestedStartTime": "2024-01-20T10:00:00Z",
  "requestedEndTime": "2024-01-20T12:00:00Z",
  "totalSpots": 50,
  "availableSpots": 12,
  "spots": [
    {
      "spotId": 15,
      "spotCode": "B-15",
      "spotType": "CAR",
      "isAccessible": false,
      "estimatedFee": 100.00
    },
    {
      "spotId": 16,
      "spotCode": "B-16",
      "spotType": "CAR",
      "isAccessible": false,
      "estimatedFee": 100.00
    }
  ],
  "message": "12 spots available"
}
```

#### 9.1.3 Check In

**Request:**
```http
PUT /api/reservations/1001/check-in?email=john@example.com
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1001,
  "status": "ACTIVE",
  "actualEntryTime": "2024-01-20T09:55:00Z",
  "message": "Check-in successful. Welcome!"
}
```

#### 9.1.4 Check Out

**Request:**
```http
PUT /api/reservations/1001/check-out?email=john@example.com
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": 1001,
  "status": "COMPLETED",
  "actualEntryTime": "2024-01-20T09:55:00Z",
  "actualExitTime": "2024-01-20T11:45:00Z",
  "estimatedFee": 100.00,
  "actualFee": 100.00,
  "paymentStatus": "PAID",
  "message": "Check-out successful. Fee charged: Rs.100.00"
}
```

#### 9.1.5 Cancel Reservation

**Request:**
```http
PUT /api/reservations/1001/cancel?email=john@example.com
Content-Type: application/json
Authorization: Bearer <token>

{
  "cancellationReason": "Plans changed"
}
```

**Response (200 OK):**
```json
{
  "id": 1001,
  "status": "CANCELLED",
  "cancelledAt": "2024-01-19T10:00:00Z",
  "cancellationReason": "Plans changed",
  "message": "Reservation cancelled. Refund: Rs.100.00"
}
```

### 9.2 DB Migration Scripts

#### 9.2.1 V1__create_reservation_table.sql

```sql
-- Migration: Create reservation table
-- Service: ticketing-service

CREATE TABLE reservation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    spot_id BIGINT NOT NULL,
    level_id BIGINT NOT NULL,
    scheduled_start_time TIMESTAMP NOT NULL,
    scheduled_end_time TIMESTAMP NOT NULL,
    duration_minutes INT NOT NULL,
    actual_entry_time TIMESTAMP NULL,
    actual_exit_time TIMESTAMP NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    estimated_fee DECIMAL(10,2) NOT NULL,
    actual_fee DECIMAL(10,2) NULL,
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    payment_id VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason VARCHAR(500) NULL,
    version BIGINT DEFAULT 0,

    INDEX idx_reservation_user_email (user_email),
    INDEX idx_reservation_vehicle (vehicle_number),
    INDEX idx_reservation_spot_time (spot_id, scheduled_start_time, scheduled_end_time),
    INDEX idx_reservation_status (status),
    INDEX idx_reservation_start_time (scheduled_start_time),

    CONSTRAINT chk_reservation_times CHECK (scheduled_end_time > scheduled_start_time),
    CONSTRAINT chk_reservation_duration CHECK (duration_minutes >= 30 AND duration_minutes <= 720)
);
```

#### 9.2.2 V2__add_spot_reservation_columns.sql

```sql
-- Migration: Add reservation support to parking_spot
-- Service: parking-lot-service

-- Add RESERVED status to enum
ALTER TABLE parking_spot
MODIFY COLUMN status ENUM('AVAILABLE', 'OCCUPIED', 'DISABLED', 'RESERVED')
DEFAULT 'AVAILABLE';

-- Add current reservation reference
ALTER TABLE parking_spot
ADD COLUMN current_reservation_id BIGINT NULL;

-- Create reservation block table
CREATE TABLE spot_reservation_block (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    spot_id BIGINT NOT NULL,
    reservation_id BIGINT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'BLOCKED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_block_spot_time (spot_id, start_time, end_time),
    INDEX idx_block_reservation (reservation_id),
    INDEX idx_block_status (status),

    FOREIGN KEY (spot_id) REFERENCES parking_spot(id) ON DELETE CASCADE
);
```

### 9.3 Architecture Diagram (Textual)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PARKING SCHEDULING SYSTEM ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐                                                                │
│  │   FRONTEND  │                                                                │
│  │   (React)   │                                                                │
│  └──────┬──────┘                                                                │
│         │ HTTP/REST                                                             │
│         ▼                                                                       │
│  ┌─────────────┐                                                                │
│  │ API GATEWAY │◀─────────── Authentication (JWT)                               │
│  │   (8080)    │                                                                │
│  └──────┬──────┘                                                                │
│         │                                                                       │
│         ├────────────────────┬────────────────────┬──────────────────┐         │
│         │                    │                    │                  │         │
│         ▼                    ▼                    ▼                  ▼         │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐   ┌─────────────┐   │
│  │  TICKETING  │      │ PARKING-LOT │      │  PAYMENT    │   │NOTIFICATION │   │
│  │  SERVICE    │◀────▶│   SERVICE   │◀────▶│  SERVICE    │   │  SERVICE    │   │
│  │   (8082)    │      │   (8084)    │      │   (8083)    │   │   (8085)    │   │
│  └──────┬──────┘      └──────┬──────┘      └─────────────┘   └─────────────┘   │
│         │                    │                                                  │
│         │    ┌───────────────┴───────────────┐                                 │
│         │    │                               │                                 │
│         ▼    ▼                               ▼                                 │
│  ┌─────────────────────┐          ┌─────────────────────┐                      │
│  │    POSTGRESQL       │          │       REDIS         │                      │
│  │    (Database)       │          │      (Cache)        │                      │
│  │  ┌───────────────┐  │          │  - Availability     │                      │
│  │  │  reservation  │  │          │  - Session data     │                      │
│  │  │     table     │  │          │  - Rate limiting    │                      │
│  │  └───────────────┘  │          └─────────────────────┘                      │
│  │  ┌───────────────┐  │                                                       │
│  │  │ spot_block    │  │                                                       │
│  │  │    table      │  │                                                       │
│  │  └───────────────┘  │                                                       │
│  └─────────────────────┘                                                       │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         SCHEDULER (Spring @Scheduled)                    │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │  - Expiry Job (every 5 min): Expire no-show reservations                │   │
│  │  - Reminder Job (every 15 min): Send upcoming reservation reminders     │   │
│  │  - Cleanup Job (daily 3 AM): Remove old reservation blocks              │   │
│  │  - Status Sync Job (every 1 min): Update spot status for imminent       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 9.4 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           RESERVATION DATA FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CREATE RESERVATION:                                                             │
│  ─────────────────────                                                          │
│  User ──▶ Frontend ──▶ API Gateway ──▶ Ticketing Service                        │
│                                              │                                   │
│                                              ├──▶ Validate request               │
│                                              ├──▶ Check vehicle conflicts        │
│                                              │                                   │
│                                              ▼                                   │
│                                        Parking-Lot Service                       │
│                                              │                                   │
│                                              ├──▶ Acquire pessimistic lock       │
│                                              ├──▶ Check spot availability        │
│                                              ├──▶ Create reservation block       │
│                                              │                                   │
│                                              ▼                                   │
│                                        Ticketing Service                         │
│                                              │                                   │
│                                              ├──▶ Calculate fee                  │
│                                              ├──▶ Save reservation               │
│                                              │                                   │
│                                              ▼                                   │
│                                        Notification Service                      │
│                                              │                                   │
│                                              └──▶ Send confirmation              │
│                                                                                  │
│  CHECK-IN:                                                                       │
│  ─────────                                                                       │
│  User ──▶ Frontend ──▶ API Gateway ──▶ Ticketing Service                        │
│                                              │                                   │
│                                              ├──▶ Validate ownership             │
│                                              ├──▶ Validate check-in window       │
│                                              │                                   │
│                                              ▼                                   │
│                                        Parking-Lot Service                       │
│                                              │                                   │
│                                              └──▶ RESERVED ──▶ OCCUPIED          │
│                                                                                  │
│  AUTO-EXPIRY:                                                                    │
│  ────────────                                                                    │
│  Scheduler ──▶ Ticketing Service                                                │
│                     │                                                            │
│                     ├──▶ Find expired reservations                              │
│                     │                                                            │
│                     ▼                                                            │
│               Parking-Lot Service                                               │
│                     │                                                            │
│                     ├──▶ Release spot block                                     │
│                     ├──▶ RESERVED ──▶ AVAILABLE                                 │
│                     │                                                            │
│                     ▼                                                            │
│               Notification Service                                              │
│                     │                                                            │
│                     └──▶ Send no-show notification                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

This implementation plan provides a comprehensive guide for adding the Parking Spot Scheduling feature to the ML_Parking_Apk system. Key highlights:

1. **Database Changes**: New `reservation` table and `spot_reservation_block` table with proper indexing
2. **Backend Services**: New `ReservationService` and `SpotReservationService` with pessimistic locking
3. **API Endpoints**: Complete REST API for reservation CRUD operations
4. **Business Rules**: Configurable booking limits, grace periods, and fee calculations
5. **Frontend**: New pages for scheduling, viewing, and managing reservations
6. **Scheduler Jobs**: Automated expiry, reminders, and cleanup tasks
7. **Edge Case Handling**: Concurrency control, timezone handling, payment failures
8. **Testing**: Unit, integration, and edge case test strategies

The implementation follows the existing microservices architecture and coding patterns, ensuring consistency with the current codebase.
