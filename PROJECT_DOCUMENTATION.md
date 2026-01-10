# ML Parking Application - Complete Project Documentation

> **Smart Parking Management System**
> A comprehensive microservices-based parking lot management solution with real-time spot tracking, automated ticketing, payment processing, and Redis caching.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Design](#2-architecture-design)
3. [Technology Stack](#3-technology-stack)
4. [Microservices Details](#4-microservices-details)
5. [API Endpoints Reference](#5-api-endpoints-reference)
6. [Database Schema](#6-database-schema)
7. [Caching Architecture](#7-caching-architecture)
8. [Request Flow Diagrams](#8-request-flow-diagrams)
9. [Frontend Application](#9-frontend-application)
10. [Docker Configuration](#10-docker-configuration)
11. [Resilience Patterns](#11-resilience-patterns)
12. [Security](#12-security)
13. [Configuration Reference](#13-configuration-reference)

---

## 1. System Overview

### 1.1 Purpose
The ML Parking Application is a full-stack parking management system designed to handle:
- Multi-level parking lot management
- Real-time spot availability tracking
- Automated ticket generation and fee calculation
- Payment processing (Mock + Razorpay integration)
- Push notifications via Firebase
- Role-based access (Admin/User)

### 1.2 Key Features
- **Atomic Spot Reservation**: Pessimistic locking prevents double-booking
- **Advanced Parking Scheduling**: Reserve spots up to 3 days in advance with conflict detection
- **Redis Caching**: Reduces database load with intelligent cache invalidation
- **Service Discovery**: Eureka-based microservice registration
- **Circuit Breaker**: Resilience4j for fault tolerance
- **Containerized Deployment**: Full Docker Compose orchestration
- **Automated No-Show Handling**: Scheduled job expires unredeemed reservations

### 1.3 Port Mapping

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 8080 | Entry point for all requests |
| Vehicle Service | 8081 | Vehicle registration & lookup |
| Ticketing Service | 8082 | Ticket lifecycle management |
| Payment Service | 8083 | Payment processing |
| Parking Lot Service | 8084 | Levels, spots, occupancy |
| Notification Service | 8085 | FCM push notifications |
| Config Server | 8886 | Centralized configuration |
| Eureka Discovery | 8761 | Service registry |
| Frontend (React) | 3000 | Web application |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache storage |

---

## 2. Architecture Design

### 2.1 High-Level Architecture

```
                                    ┌─────────────────┐
                                    │   Frontend      │
                                    │   (React:3000)  │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │   API Gateway   │
                                    │     (:8080)     │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌────────────────┐       ┌────────────────┐       ┌────────────────┐
           │ Vehicle Svc    │       │ Ticketing Svc  │       │ Parking Lot    │
           │   (:8081)      │       │   (:8082)      │       │   (:8084)      │
           └───────┬────────┘       └───────┬────────┘       └───────┬────────┘
                   │                        │                        │
                   │                        ▼                        │
                   │               ┌────────────────┐                │
                   │               │ Payment Svc    │                │
                   │               │   (:8083)      │                │
                   │               └───────┬────────┘                │
                   │                       │                         │
                   └───────────────────────┼─────────────────────────┘
                                           │
                           ┌───────────────┴───────────────┐
                           │                               │
                           ▼                               ▼
                  ┌─────────────────┐             ┌─────────────────┐
                  │   PostgreSQL    │             │     Redis       │
                  │    (:5432)      │             │    (:6379)      │
                  └─────────────────┘             └─────────────────┘
```

### 2.2 Service Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EUREKA DISCOVERY SERVER                        │
│                                   (:8761)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Registered Services:                                                       │
│  • VEHICLE-SERVICE         → vehicle-service:8081                          │
│  • TICKETING-SERVICE       → ticketing-service:8082                        │
│  • PAYMENT-SERVICE         → payment-service:8083                          │
│  • PARKING-LOT-SERVICE     → parking-lot-service:8084                      │
│  • NOTIFICATION-SERVICE    → notification-service:8085                     │
│  • API-GATEWAY             → api-gateway:8080                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Inter-Service Communication

Services communicate via **Spring Cloud LoadBalanced WebClient**:

```java
// Example: Ticketing Service → Parking Lot Service
loadBalancedWebClient.put()
    .uri("http://PARKING-LOT-SERVICE:8084/parking/spots/{spotId}/occupy", spotId)
    .retrieve()
    .bodyToMono(Void.class)
    .block();
```

---

## 3. Technology Stack

### 3.1 Backend

| Component | Technology |
|-----------|------------|
| Framework | Spring Boot 3.x |
| Language | Java 17 |
| Build Tool | Maven |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Service Discovery | Netflix Eureka |
| API Gateway | Spring Cloud Gateway |
| Resilience | Resilience4j |
| HTTP Client | WebClient (Reactive) |

### 3.2 Frontend

| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Routing | React Router DOM 6 |
| HTTP Client | Axios |
| Styling | Bootstrap 5 |
| State | Context API |

### 3.3 DevOps

| Component | Technology |
|-----------|------------|
| Containerization | Docker |
| Orchestration | Docker Compose |
| Build | Multi-stage Dockerfile |

---

## 4. Microservices Details

### 4.1 Vehicle Service (Port 8081)

**Purpose**: Manages vehicle registration and lookup.

**Responsibilities**:
- Register new vehicles
- Lookup vehicles by license plate
- Delete vehicle records
- Cache vehicle data in Redis

**Key Methods**:
```java
@Service
public class VehicleService {
    @Cacheable(value = "vehicles", key = "'all'")
    public List<Vehicle> getAllVehicles();

    @Cacheable(value = "vehicleByPlate", key = "#licensePlate")
    public List<Vehicle> getVehicleByLicense(String licensePlate);

    @Caching(evict = {
        @CacheEvict(value = "vehicles", allEntries = true),
        @CacheEvict(value = "vehicleByPlate", allEntries = true)
    })
    public Vehicle saveVehicle(Vehicle vehicle);
}
```

---

### 4.2 Parking Lot Service (Port 8084)

**Purpose**: Manages parking levels, spots, and occupancy.

**Responsibilities**:
- Create parking levels with spots (atomic)
- Track spot availability
- Occupy/release spots with pessimistic locking
- Enable/disable spots for maintenance
- Provide parking statistics

**Key Methods**:
```java
@Service
public class ParkingLotService {
    // Atomic level creation with spots
    @Transactional(rollbackFor = Exception.class)
    public LevelResponse createLevelWithSpots(LevelRequest request);

    // Pessimistic locking for spot occupation
    @Transactional
    public SpotResponse occupySpot(Long spotId) {
        ParkingSpot spot = spotRepo.findSpotForUpdate(spotId); // PESSIMISTIC_WRITE
        if (spot.getStatus() == SpotStatus.OCCUPIED) {
            throw new IllegalStateException("Spot is already occupied");
        }
        if (spot.getStatus() == SpotStatus.DISABLED) {
            throw new IllegalStateException("Spot is out of service");
        }
        spot.occupy();
        return mapToResponse(spotRepo.save(spot));
    }
}
```

---

### 4.3 Ticketing Service (Port 8082)

**Purpose**: Manages the complete ticket lifecycle and parking reservations.

**Responsibilities**:
- Create tickets (with atomic spot occupation)
- Track user tickets
- Process vehicle exit (with mandatory payment)
- Calculate parking fees
- Admin ticket management
- **Reservation Management**: Create, cancel, and check-in to reservations
- **Availability Queries**: Get available time slots for spots
- **Scheduled Tasks**: Expire no-show reservations automatically

**Fee Calculation**:
```java
private double calculateFee(LocalDateTime entryTime) {
    long hours = ChronoUnit.HOURS.between(entryTime, LocalDateTime.now());
    return Math.max(50, hours * 50); // Minimum Rs.50, Rs.50/hour
}
```

**Exit Flow**:
```java
@Transactional
public TicketResponse exitUserVehicle(Long ticketId, String userEmail) {
    // 1. Validate ticket ownership
    Ticket ticket = ticketRepository.findByIdAndUserEmail(ticketId, userEmail)
        .orElseThrow(() -> new RuntimeException("Ticket not found or access denied"));

    // 2. Calculate fee
    double fee = calculateFee(ticket.getEntryTime());

    // 3. Process payment (MANDATORY)
    processPayment(ticketId, ticket.getVehicleNumber(), (int) fee);

    // 4. Close ticket
    ticket.setExitTime(LocalDateTime.now());
    ticket.setStatus(TicketStatus.CLOSED);
    ticket.setFee(fee);
    ticketRepository.save(ticket);

    // 5. Release parking spot
    releaseSpot(ticket.getSpotId());

    return mapToResponse(ticket);
}
```

---

### 4.3.1 Reservation Feature (Part of Ticketing Service)

**Purpose**: Allows users to reserve parking spots in advance.

**Configuration Constants**:
```java
MAX_ADVANCE_DAYS = 3        // Book up to 3 days ahead
MAX_DURATION_HOURS = 4      // Maximum reservation duration
MIN_DURATION_MINUTES = 30   // Minimum reservation duration
GRACE_PERIOD_MINUTES = 10   // Check-in window before/after start
SLOT_DURATION_MINUTES = 30  // Time slot granularity
DAY_START = 06:00           // Earliest reservation time
DAY_END = 22:00             // Latest reservation end time
```

**Reservation Status Lifecycle**:
```
CREATED → ACTIVE (check-in) → [ticket flow]
CREATED → EXPIRED (no-show after grace period)
CREATED → CANCELLED (user cancellation)
```

**Key Methods**:
```java
@Service
public class ReservationService {
    // Create reservation with conflict detection
    @Transactional
    public ReservationResponse createReservation(CreateReservationRequest request) {
        // 1. Validate time window (future, within 3 days, 30min-4hr duration)
        validateTimeWindow(request.getStartTime(), request.getEndTime());

        // 2. Check for spot conflicts
        if (reservationRepository.existsSpotConflict(spotId, startTime, endTime)) {
            throw new IllegalStateException("Spot is already reserved");
        }

        // 3. Check for vehicle conflicts (same user double-booking)
        if (reservationRepository.existsVehicleConflict(vehicleNumber, startTime, endTime)) {
            throw new IllegalStateException("You already have a reservation during this time");
        }

        // 4. Create and save reservation
        return mapToResponse(reservationRepository.save(reservation));
    }

    // Check-in converts reservation to active ticket
    @Transactional
    public CheckInResponse checkIn(Long reservationId, String userEmail) {
        Reservation reservation = findAndValidateOwnership(reservationId, userEmail);

        // Validate check-in window (±10 minutes of start time)
        if (!reservation.canCheckIn(LocalDateTime.now())) {
            throw new IllegalStateException("Outside check-in window");
        }

        // Create ticket using existing TicketService
        Ticket ticket = ticketService.createTicket(buildTicketRequest(reservation));

        // Update reservation status
        reservation.setStatus(ReservationStatus.ACTIVE);
        reservation.setTicketId(ticket.getId());

        return new CheckInResponse(reservationId, ticket.getId(), "ACTIVE", "Checked in successfully");
    }
}
```

**Scheduled Expiry Job**:
```java
@Component
@EnableScheduling
public class ReservationExpiryJob {

    @Scheduled(fixedRate = 300000) // Every 5 minutes
    public void expireNoShowReservations() {
        // Find reservations that are:
        // - Status = CREATED
        // - startTime + GRACE_PERIOD < now
        // Mark as EXPIRED
        int count = reservationService.expireNoShowReservations();
        if (count > 0) {
            System.out.println("Expired " + count + " no-show reservations");
        }
    }
}
```

**Conflict Detection Queries**:
```java
@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    // Spot conflict: overlapping time ranges for same spot
    @Query("SELECT COUNT(r) > 0 FROM Reservation r " +
           "WHERE r.spotId = :spotId " +
           "AND r.status IN ('CREATED', 'ACTIVE') " +
           "AND r.startTime < :endTime " +
           "AND r.endTime > :startTime")
    boolean existsSpotConflict(@Param("spotId") Long spotId,
                                @Param("startTime") LocalDateTime startTime,
                                @Param("endTime") LocalDateTime endTime);

    // Vehicle conflict: same vehicle with overlapping reservation
    @Query("SELECT COUNT(r) > 0 FROM Reservation r " +
           "WHERE r.vehicleNumber = :vehicleNumber " +
           "AND r.status IN ('CREATED', 'ACTIVE') " +
           "AND r.startTime < :endTime " +
           "AND r.endTime > :startTime")
    boolean existsVehicleConflict(@Param("vehicleNumber") String vehicleNumber,
                                   @Param("startTime") LocalDateTime startTime,
                                   @Param("endTime") LocalDateTime endTime);
}
```

---

### 4.4 Payment Service (Port 8083)

**Purpose**: Handles payment processing.

**Modes**:
- **MOCK** (default): Simulates payments for testing
- **RAZORPAY**: Production integration with Razorpay API

**Mock Mode Behavior**:
```java
@PostMapping("/create")
public PaymentResponse createPayment(@RequestBody PaymentRequest request) {
    if ("MOCK".equals(paymentMode)) {
        if (request.getAmount() > 7000) {
            return PaymentResponse.builder()
                .status("FAILED")
                .reason("Mock failure: amount exceeds limit")
                .build();
        }
        return PaymentResponse.builder()
            .status("SUCCESS")
            .paymentId("MOCK_PAY_" + request.getTicketId())
            .build();
    }
    // Razorpay integration...
}
```

---

### 4.5 Notification Service (Port 8085)

**Purpose**: Sends push notifications via Firebase Cloud Messaging.

**Usage**:
```java
POST /api/notifications/send?token={fcmToken}&title={title}&body={body}
```

---

### 4.6 API Gateway (Port 8080)

**Purpose**: Single entry point for all client requests.

**Route Configuration** (application.yml):
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: parking_route
          uri: lb://PARKING-LOT-SERVICE
          predicates:
            - Path=/api/parking/**
          filters:
            - RewritePath=/api/parking/(?<segment>.*), /parking/${segment}

        - id: ticketing_route
          uri: lb://TICKETING-SERVICE
          predicates:
            - Path=/api/ticketing/**
          filters:
            - RewritePath=/api/ticketing/(?<segment>.*), /ticketing/${segment}

        - id: vehicle_route
          uri: lb://VEHICLE-SERVICE
          predicates:
            - Path=/api/vehicle/**
          filters:
            - RewritePath=/api/vehicle/(?<segment>.*), /vehicle/${segment}

        - id: payments_route
          uri: lb://PAYMENT-SERVICE
          predicates:
            - Path=/api/payments/**
          filters:
            - RewritePath=/api/payments/(?<segment>.*), /payments/${segment}
```

---

## 5. API Endpoints Reference

### 5.1 Vehicle Service (`/api/vehicle`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/save` | Register a new vehicle | User |
| `GET` | `/all` | Get all vehicles | Admin |
| `GET` | `/{licensePlate}` | Get vehicle by plate | User |
| `DELETE` | `/{id}` | Delete vehicle | Admin |

**Request/Response Examples**:

```json
// POST /api/vehicle/save
// Request:
{
  "licensePlate": "KA-01-AB-1234",
  "type": "CAR",
  "isDisabled": false,
  "ownerName": "John Doe"
}

// Response:
{
  "id": 1,
  "licensePlate": "KA-01-AB-1234",
  "type": "CAR",
  "isDisabled": false,
  "ownerName": "John Doe"
}
```

---

### 5.2 Parking Lot Service (`/api/parking`)

#### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/levels` | Get all parking levels |
| `GET` | `/levels/details` | Get levels with spot details |
| `GET` | `/levels/{levelId}/spots/all` | Get all spots for a level |
| `GET` | `/spots/{levelId}?isDisabled=false` | Get available spots |
| `GET` | `/stats` | Get parking statistics |

#### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/levels/create` | Create level with spots |
| `POST` | `/levels/{levelId}/spots` | Add spot to level |
| `PUT` | `/admin/spots/{spotId}/enable` | Enable a spot |
| `PUT` | `/admin/spots/{spotId}/disable` | Disable a spot |

#### Internal Endpoints (Service-to-Service)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/spots/{spotId}/occupy` | Occupy a spot (with lock) |
| `PUT` | `/spots/{spotId}/release` | Release a spot |

**Request/Response Examples**:

```json
// POST /api/parking/levels/create
// Request:
{
  "levelNumber": "B1",
  "name": "Basement Level 1",
  "totalSpots": 50,
  "carSpots": 30,
  "bikeSpots": 10,
  "evSpots": 5,
  "handicappedSpots": 5
}

// Response:
{
  "id": 1,
  "levelNumber": "B1",
  "name": "Basement Level 1",
  "totalSpots": 50,
  "availableSpots": 50,
  "occupiedSpots": 0,
  "spotsByType": {
    "CAR": 30,
    "BIKE": 10,
    "EV": 5,
    "HANDICAPPED": 5
  },
  "message": "Level created successfully with 50 spots"
}
```

```json
// GET /api/parking/stats
// Response:
{
  "totalLevels": 3,
  "totalSpots": 150,
  "availableSpots": 120,
  "occupiedSpots": 25,
  "disabledSpots": 5,
  "occupancyPercentage": 17.24,
  "levelStats": [
    {
      "levelId": 1,
      "levelNumber": "B1",
      "levelName": "Basement 1",
      "totalSpots": 50,
      "availableSpots": 40,
      "occupiedSpots": 8,
      "disabledSpots": 2,
      "occupancyPercentage": 16.67
    }
  ]
}
```

---

### 5.3 Ticketing Service (`/api/ticketing`)

#### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/user/create` | Create ticket (vehicle entry) |
| `GET` | `/user/tickets?email={email}` | Get user's tickets |
| `GET` | `/user/tickets/active?email={email}` | Get active tickets |
| `GET` | `/user/tickets/{id}?email={email}` | Get specific ticket |
| `PUT` | `/user/exit/{ticketId}?email={email}` | Exit vehicle |

#### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/tickets` | Get all tickets |
| `GET` | `/admin/tickets/active` | Get all active tickets |
| `GET` | `/admin/stats` | Get system statistics |
| `PUT` | `/admin/exit/{ticketId}` | Force exit any ticket |

**Request/Response Examples**:

```json
// POST /api/ticketing/user/create
// Request:
{
  "userId": "user123",
  "userEmail": "user@example.com",
  "vehicleNumber": "KA-01-AB-1234",
  "spotId": 15,
  "levelId": 1
}

// Response:
{
  "id": 101,
  "userId": "user123",
  "userEmail": "user@example.com",
  "vehicleNumber": "KA-01-AB-1234",
  "spotId": 15,
  "levelId": 1,
  "entryTime": "2025-01-08T10:30:00",
  "exitTime": null,
  "status": "ACTIVE",
  "fee": null
}
```

```json
// PUT /api/ticketing/user/exit/101?email=user@example.com
// Response:
{
  "id": 101,
  "userId": "user123",
  "userEmail": "user@example.com",
  "vehicleNumber": "KA-01-AB-1234",
  "spotId": 15,
  "levelId": 1,
  "entryTime": "2025-01-08T10:30:00",
  "exitTime": "2025-01-08T14:30:00",
  "status": "CLOSED",
  "fee": 200.0,
  "message": "Payment successful. Vehicle exited. Fee: Rs.200.0"
}
```

---

### 5.4 Payment Service (`/api/payments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/create` | Create payment order |

**Request/Response Examples**:

```json
// POST /api/payments/create
// Request:
{
  "ticketId": 101,
  "vehicleNumber": "KA-01-AB-1234",
  "amount": 200
}

// Response (Success):
{
  "status": "SUCCESS",
  "paymentId": "MOCK_PAY_101"
}

// Response (Failure):
{
  "status": "FAILED",
  "reason": "Payment processing failed"
}
```

---

## 6. Database Schema

### 6.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     Vehicle      │       │   ParkingLevel   │       │    Ticket        │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ licensePlate (U) │       │ levelNumber (U)  │       │ userId           │
│ type             │       │ name             │       │ userEmail        │
│ isDisabled       │       │ totalSpots       │       │ vehicleNumber    │
│ ownerName        │       └────────┬─────────┘       │ spotId (FK)      │
└──────────────────┘                │                 │ levelId (FK)     │
                                    │ 1:N             │ entryTime        │
                                    ▼                 │ exitTime         │
                         ┌──────────────────┐         │ status           │
                         │   ParkingSpot    │         │ fee              │
                         ├──────────────────┤         └────────┬─────────┘
                         │ id (PK)          │                  ▲
                         │ spotCode         │                  │
                         │ spotType         │                  │ ticketId (FK)
                         │ status           │                  │
                         │ isDisabled       │         ┌────────┴─────────┐
                         │ isOccupied       │         │   Reservation    │
                         │ level_id (FK)    │         ├──────────────────┤
                         └──────────────────┘         │ id (PK)          │
                                  ▲                   │ userId           │
                                  │                   │ userEmail        │
                                  │ spotId (FK)       │ vehicleNumber    │
                                  └───────────────────│ spotId (FK)      │
                                                      │ levelId (FK)     │
                                                      │ startTime        │
                                                      │ endTime          │
                                                      │ status           │
                                                      │ ticketId (FK)    │
                                                      │ createdAt        │
                                                      └──────────────────┘

UNIQUE: (spot_code, level_id)
INDEX: (spotId, startTime, endTime) - for conflict detection
INDEX: (userEmail) - for user queries
INDEX: (status) - for scheduler queries
```

### 6.2 Entity Definitions

#### Vehicle Entity
```java
@Entity
public class Vehicle {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String licensePlate;

    @Enumerated(EnumType.STRING)
    private VehicleType type;  // CAR, BIKE, TRUCK

    private boolean isDisabled;
    private String ownerName;
}
```

#### ParkingLevel Entity
```java
@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = "levelNumber"))
public class ParkingLevel {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String levelNumber;  // "A", "B1", etc.
    private String name;
    private int totalSpots;

    @OneToMany(mappedBy = "level", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<ParkingSpot> spots;
}
```

#### ParkingSpot Entity
```java
@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"spot_code", "level_id"}))
public class ParkingSpot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String spotCode;     // "A1", "A2", "B1"
    private String spotType;     // CAR, BIKE, EV, HANDICAPPED

    @Enumerated(EnumType.STRING)
    private SpotStatus status;   // AVAILABLE, OCCUPIED, DISABLED

    private boolean isDisabled;  // Handicapped accessibility flag
    private boolean isOccupied;  // Legacy compatibility

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "level_id")
    @JsonBackReference
    private ParkingLevel level;

    public enum SpotStatus {
        AVAILABLE,   // Ready for use
        OCCUPIED,    // Currently in use
        DISABLED     // Out of service
    }
}
```

#### Ticket Entity
```java
@Entity
public class Ticket {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;
    private String userEmail;
    private String vehicleNumber;
    private Long spotId;
    private Long levelId;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;

    @Enumerated(EnumType.STRING)
    private TicketStatus status;  // ACTIVE, CLOSED

    private Double fee;

    public enum TicketStatus {
        ACTIVE,
        CLOSED
    }
}
```

#### Reservation Entity
```java
@Entity
@Table(name = "reservation",
    indexes = {
        @Index(name = "idx_reservation_user_email", columnList = "userEmail"),
        @Index(name = "idx_reservation_status", columnList = "status"),
        @Index(name = "idx_reservation_start_time", columnList = "startTime"),
        @Index(name = "idx_reservation_spot_time", columnList = "spotId, startTime, endTime")
    }
)
public class Reservation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;
    private String userEmail;
    private String vehicleNumber;
    private Long spotId;
    private Long levelId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    private ReservationStatus status = ReservationStatus.CREATED;

    private Long ticketId;           // Linked after check-in
    private LocalDateTime createdAt;

    // Helper methods
    public boolean canCheckIn(LocalDateTime now) {
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

    public enum ReservationStatus {
        CREATED,    // Awaiting check-in
        ACTIVE,     // Checked in, ticket created
        EXPIRED,    // No-show after grace period
        CANCELLED   // User cancelled
    }
}
```

### 6.3 Database Initialization

```sql
-- init-db-scripts/create-dbs.sql
CREATE DATABASE parking_lot_service;
CREATE DATABASE payment_service;
CREATE DATABASE vehicle_service;
CREATE DATABASE notification_service;
-- ticketing_service created via docker-compose
```

---

## 7. Caching Architecture

### 7.1 Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REDIS CACHING ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐                                                       │
│   │   Redis Cache   │◄───────────────────────────────────────┐              │
│   │    (:6379)      │                                        │              │
│   └────────┬────────┘                                        │              │
│            │                                                 │              │
│            │  Cache Read/Write                               │              │
│            │                                                 │              │
│   ┌────────┴────────────────────────────────────────────────┴────────┐     │
│   │                                                                    │     │
│   ▼                          ▼                          ▼              │     │
│ ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │     │
│ │Vehicle Svc   │    │Parking Lot   │    │Ticketing Svc │              │     │
│ │              │    │  Service     │    │              │              │     │
│ │ • vehicles   │    │ • parkingLvl │    │ • tickets    │              │     │
│ │ • vehByPlate │    │ • lvlDetails │    │ • tickStats  │              │     │
│ │              │    │ • parkStats  │    │ • adminTkts  │              │     │
│ └──────────────┘    └──────────────┘    └──────────────┘              │     │
│                                                                        │     │
└────────────────────────────────────────────────────────────────────────┘     │
                                                                               │
                           Cache Eviction on Write ────────────────────────────┘
```

### 7.2 Cache Configuration

**Redis Settings** (docker-compose.yml):
```yaml
redis:
  image: redis:7-alpine
  container_name: redis-cache
  ports:
    - "6379:6379"
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
  volumes:
    - redis_data:/data
```

### 7.3 Cache Definitions by Service

#### Vehicle Service Caches

| Cache Name | Key Pattern | TTL | Description |
|------------|-------------|-----|-------------|
| `vehicles` | `'all'` | 5 min | All vehicles list |
| `vehicleByPlate` | `{licensePlate}` | 10 min | Vehicle by plate |

```java
@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory cf) {
        Map<String, RedisCacheConfiguration> configs = new HashMap<>();
        configs.put("vehicles", config.entryTtl(Duration.ofMinutes(5)));
        configs.put("vehicleByPlate", config.entryTtl(Duration.ofMinutes(10)));
        return RedisCacheManager.builder(cf)
            .withInitialCacheConfigurations(configs)
            .build();
    }
}
```

#### Parking Lot Service Caches

| Cache Name | Key Pattern | TTL | Description |
|------------|-------------|-----|-------------|
| `parkingLevels` | `'all'` | 5 min | All parking levels |
| `parkingLevelsDetails` | `'details'` | 2 min | Levels with spot counts |
| `parkingStats` | `'system'` | 1 min | System-wide statistics |

```java
@Bean
public RedisCacheManager cacheManager(RedisConnectionFactory cf) {
    Map<String, RedisCacheConfiguration> configs = new HashMap<>();
    configs.put("parkingLevels", config.entryTtl(Duration.ofMinutes(5)));
    configs.put("parkingLevelsDetails", config.entryTtl(Duration.ofMinutes(2)));
    configs.put("parkingStats", config.entryTtl(Duration.ofMinutes(1)));
    return RedisCacheManager.builder(cf)
        .withInitialCacheConfigurations(configs)
        .build();
}
```

#### Ticketing Service Caches

| Cache Name | Key Pattern | TTL | Description |
|------------|-------------|-----|-------------|
| `tickets` | `{ticketId}` | 2 min | Individual ticket |
| `ticketingStats` | `'system'` | 1 min | Ticketing statistics |
| `adminTickets` | `'all'` | 1 min | All tickets (admin) |

```java
@Bean
public RedisCacheManager cacheManager(RedisConnectionFactory cf) {
    Map<String, RedisCacheConfiguration> configs = new HashMap<>();
    configs.put("tickets", config.entryTtl(Duration.ofMinutes(2)));
    configs.put("ticketingStats", config.entryTtl(Duration.ofMinutes(1)));
    configs.put("adminTickets", config.entryTtl(Duration.ofMinutes(1)));
    return RedisCacheManager.builder(cf)
        .withInitialCacheConfigurations(configs)
        .build();
}
```

### 7.4 Cache Annotations Usage

#### Read Operations (Cache Population)

```java
// Single cache read
@Cacheable(value = "vehicles", key = "'all'")
public List<Vehicle> getAllVehicles() {
    System.out.println("Fetching from database (cache miss)");
    return repo.findAll();
}

// Parameterized cache read
@Cacheable(value = "vehicleByPlate", key = "#licensePlate")
public List<Vehicle> getVehicleByLicense(String licensePlate) {
    return repo.findByLicensePlate(licensePlate);
}

// Complex key
@Cacheable(value = "tickets", key = "#ticketId")
public Ticket getTicket(Long ticketId) {
    return ticketRepository.findById(ticketId).orElseThrow();
}
```

#### Write Operations (Cache Eviction)

```java
// Single cache eviction
@CacheEvict(value = "vehicles", allEntries = true)
public Vehicle saveVehicle(Vehicle vehicle) {
    return repo.save(vehicle);
}

// Multiple cache eviction
@Caching(evict = {
    @CacheEvict(value = "tickets", allEntries = true),
    @CacheEvict(value = "ticketingStats", allEntries = true),
    @CacheEvict(value = "adminTickets", allEntries = true)
})
@Transactional
public Ticket createTicket(CreateTicketRequest request) {
    // Creates ticket and evicts all related caches
}
```

### 7.5 Cache Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CACHE READ FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Request                                                                   │
│      │                                                                      │
│      ▼                                                                      │
│   ┌──────────────┐     Cache Hit?      ┌──────────────┐                    │
│   │ @Cacheable   │────────YES─────────►│ Return from  │                    │
│   │  Method      │                      │    Redis     │                    │
│   └──────┬───────┘                      └──────────────┘                    │
│          │                                                                  │
│          │ NO (Cache Miss)                                                  │
│          ▼                                                                  │
│   ┌──────────────┐                      ┌──────────────┐                    │
│   │  Database    │─────────────────────►│ Store in     │                    │
│   │   Query      │                      │ Redis Cache  │                    │
│   └──────────────┘                      └──────────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            CACHE WRITE FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Write Request                                                             │
│      │                                                                      │
│      ▼                                                                      │
│   ┌──────────────┐                                                          │
│   │ @CacheEvict  │                                                          │
│   │  or @Caching │                                                          │
│   └──────┬───────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────┐          ┌──────────────┐                               │
│   │  Database    │          │   Evict      │                               │
│   │   Write      │─────────►│ Redis Cache  │                               │
│   └──────────────┘          └──────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.6 Cache Key Strategy

| Service | Cache | Key Pattern | Example Key |
|---------|-------|-------------|-------------|
| Vehicle | vehicles | Static `'all'` | `vehicles::all` |
| Vehicle | vehicleByPlate | `{licensePlate}` | `vehicleByPlate::KA-01-AB-1234` |
| Parking | parkingLevels | Static `'all'` | `parkingLevels::all` |
| Parking | parkingLevelsDetails | Static `'details'` | `parkingLevelsDetails::details` |
| Parking | parkingStats | Static `'system'` | `parkingStats::system` |
| Ticketing | tickets | `{ticketId}` | `tickets::101` |
| Ticketing | ticketingStats | Static `'system'` | `ticketingStats::system` |
| Ticketing | adminTickets | Static `'all'` | `adminTickets::all` |

### 7.7 TTL Strategy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| System Stats | 1 min | High-frequency updates |
| Active Lists | 2 min | Moderate change frequency |
| Master Data | 5 min | Low change frequency |
| Lookup Data | 10 min | Rarely changes |

---

## 8. Request Flow Diagrams

### 8.1 Vehicle Entry Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          VEHICLE ENTRY FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User                                                                       │
│   │                                                                         │
│   │ 1. Select spot & enter vehicle number                                   │
│   ▼                                                                         │
│  ┌──────────────┐                                                           │
│  │   Frontend   │                                                           │
│  │ CreateTicket │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         │ POST /api/ticketing/user/create                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │ API Gateway  │                                                           │
│  │   (:8080)    │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         │ Route to TICKETING-SERVICE                                        │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │  Ticketing   │                                                           │
│  │   Service    │                                                           │
│  │   (:8082)    │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         │ 2. Check for existing active ticket                               │
│         │                                                                   │
│         │ 3. PUT /parking/spots/{spotId}/occupy                             │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │ Parking Lot  │                                                           │
│  │   Service    │◄─────── Pessimistic Lock (SELECT FOR UPDATE)              │
│  │   (:8084)    │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         │ 4. Validate: not occupied, not disabled                           │
│         │ 5. Set status = OCCUPIED                                          │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │  Ticketing   │                                                           │
│  │   Service    │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         │ 6. Create Ticket (status = ACTIVE)                                │
│         │ 7. Evict caches                                                   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │   Response   │                                                           │
│  │   Ticket ID  │                                                           │
│  └──────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Vehicle Exit Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          VEHICLE EXIT FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User                                                                       │
│   │                                                                         │
│   │ 1. Click "Exit" on active ticket                                        │
│   ▼                                                                         │
│  ┌──────────────┐                                                           │
│  │   Frontend   │                                                           │
│  │  MyTickets   │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         │ PUT /api/ticketing/user/exit/{ticketId}?email={email}             │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │ API Gateway  │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │  Ticketing   │                                                           │
│  │   Service    │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         │ 2. Validate ticket ownership (email match)                        │
│         │ 3. Calculate fee: max(50, hours * 50)                             │
│         │                                                                   │
│         │ 4. POST /payments/create                                          │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │   Payment    │                                                           │
│  │   Service    │                                                           │
│  │   (:8083)    │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         │ 5. Process payment (Mock/Razorpay)                                │
│         │    Return: { status: "SUCCESS", paymentId: "..." }                │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │  Ticketing   │                                                           │
│  │   Service    │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         │ 6. Update ticket: exitTime, status=CLOSED, fee                    │
│         │                                                                   │
│         │ 7. PUT /parking/spots/{spotId}/release                            │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │ Parking Lot  │                                                           │
│  │   Service    │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         │ 8. Set spot status = AVAILABLE                                    │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │  Ticketing   │                                                           │
│  │   Service    │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                   │
│         │ 9. Evict caches                                                   │
│         │ 10. Return response with fee                                      │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │   Response   │                                                           │
│  │ "Fee: Rs.X"  │                                                           │
│  └──────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Parking Level Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PARKING LEVEL CREATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Admin                                                                      │
│   │                                                                         │
│   │ POST /api/parking/levels/create                                         │
│   │ {                                                                       │
│   │   "levelNumber": "B1",                                                  │
│   │   "totalSpots": 50,                                                     │
│   │   "carSpots": 30, "bikeSpots": 10,                                     │
│   │   "evSpots": 5, "handicappedSpots": 5                                  │
│   │ }                                                                       │
│   ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      @Transactional (Atomic)                          │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                        │   │
│  │  1. Validate Request                                                   │   │
│  │     • levelNumber required                                             │   │
│  │     • totalSpots > 0 and <= 1000                                       │   │
│  │     • Spot distribution sums to totalSpots                             │   │
│  │                                                                        │   │
│  │  2. Check Duplicate                                                    │   │
│  │     • Query: levelRepo.existsByLevelNumber("B1")                       │   │
│  │     • Throw DuplicateLevelException if exists                          │   │
│  │                                                                        │   │
│  │  3. Create Level Entity                                                │   │
│  │     ParkingLevel level = new ParkingLevel();                          │   │
│  │     level.setLevelNumber("B1");                                       │   │
│  │     level.setTotalSpots(50);                                          │   │
│  │                                                                        │   │
│  │  4. Generate Spots                                                     │   │
│  │     ┌────────────────────────────────────────┐                        │   │
│  │     │ FOR i = 1 to carSpots (30):           │                        │   │
│  │     │   createSpot("A" + i, "CAR", false)   │                        │   │
│  │     │ FOR i = 1 to bikeSpots (10):          │                        │   │
│  │     │   createSpot("B" + i, "BIKE", false)  │                        │   │
│  │     │ FOR i = 1 to evSpots (5):             │                        │   │
│  │     │   createSpot("C" + i, "EV", false)    │                        │   │
│  │     │ FOR i = 1 to handicappedSpots (5):    │                        │   │
│  │     │   createSpot("D" + i, "HANDICAPPED",  │                        │   │
│  │     │              isDisabled=true)          │                        │   │
│  │     └────────────────────────────────────────┘                        │   │
│  │                                                                        │   │
│  │  5. Validate Spot Codes (no duplicates)                               │   │
│  │                                                                        │   │
│  │  6. Cascade Save                                                       │   │
│  │     levelRepo.save(level) → saves level + all spots                   │   │
│  │                                                                        │   │
│  │  7. Evict Caches                                                       │   │
│  │     • parkingLevels                                                    │   │
│  │     • parkingLevelsDetails                                             │   │
│  │     • parkingStats                                                     │   │
│  │                                                                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐                                                           │
│  │   Response   │                                                           │
│  │ LevelResponse│                                                           │
│  │ with spots   │                                                           │
│  └──────────────┘                                                           │
│                                                                             │
│  On ANY error → Rollback entire transaction                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.4 Race Condition Prevention

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PESSIMISTIC LOCKING - SPOT OCCUPATION                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User A                                User B                               │
│    │                                     │                                  │
│    │ Book Spot 15                        │ Book Spot 15                     │
│    │                                     │                                  │
│    ▼                                     ▼                                  │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │                         DATABASE (Spot 15)                             │   │
│ │                                                                         │   │
│ │  SELECT * FROM parking_spot WHERE id=15 FOR UPDATE                     │   │
│ │                                                                         │   │
│ │  User A acquires lock ─────────────────────────────────────────────►   │   │
│ │                           │                                             │   │
│ │                           │                      User B WAITS           │   │
│ │                           │                      (blocked by lock)      │   │
│ │  User A:                  │                           │                 │   │
│ │  • Check: not occupied ✓  │                           │                 │   │
│ │  • Check: not disabled ✓  │                           │                 │   │
│ │  • Set: occupied = true   │                           │                 │   │
│ │  • COMMIT                 │                           │                 │   │
│ │                           │                           │                 │   │
│ │  Lock released ───────────┼───────────────────────────┘                 │   │
│ │                           │                                             │   │
│ │                           │   User B acquires lock                      │   │
│ │                           │   • Check: not occupied ✗ (OCCUPIED!)       │   │
│ │                           │   • Throw IllegalStateException             │   │
│ │                           │                                             │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Result: User A gets spot, User B gets error "Spot already occupied"       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Repository Method:
@Query("SELECT s FROM ParkingSpot s WHERE s.id = :spotId")
@Lock(LockModeType.PESSIMISTIC_WRITE)
ParkingSpot findSpotForUpdate(@Param("spotId") Long spotId);
```

---

## 9. Frontend Application

### 9.1 Directory Structure

```
frontend-service/
├── public/
│   └── index.html
├── src/
│   ├── api/                        # API service modules
│   │   ├── axiosConfig.js         # Base config, interceptors
│   │   ├── parkingLotService.js   # Parking endpoints
│   │   ├── ticketService.js       # Ticketing endpoints
│   │   ├── vehicleService.js      # Vehicle endpoints
│   │   ├── paymentService.js      # Payment endpoints
│   │   ├── notificationService.js # Notification endpoints
│   │   └── reservationService.js  # Reservation endpoints (NEW)
│   │
│   ├── components/                 # Reusable components
│   │   ├── NavBar.js              # Navigation header
│   │   ├── Loading.js             # Loading spinner
│   │   └── ErrorMessage.js        # Error display
│   │
│   ├── context/                    # React Context
│   │   └── AuthContext.js         # Authentication state
│   │
│   ├── pages/                      # Page components
│   │   ├── Login.js               # Login page
│   │   ├── Dashboard.js           # User home (with schedule parking section)
│   │   ├── CreateTicket.js        # Create new ticket (park now)
│   │   ├── ScheduleParking.js     # Schedule reservation (NEW)
│   │   ├── MyReservations.js      # View/manage reservations (NEW)
│   │   ├── MyTickets.js           # User's tickets
│   │   ├── TicketDetails.js       # Ticket detail view
│   │   ├── LevelsPage.js          # View parking levels
│   │   ├── SpotsPage.js           # View level spots
│   │   ├── RegisterVehiclePage.js # Register vehicle
│   │   ├── VehicleEntryPage.js    # Admin: vehicle entry
│   │   ├── VehicleExitPage.js     # Admin: vehicle exit
│   │   └── admin/
│   │       ├── AdminDashboard.js  # Admin home
│   │       ├── ManageLevels.js    # Manage parking levels
│   │       └── VehiclesPage.js    # Manage vehicles
│   │
│   ├── App.js                      # Main app with routing
│   └── index.js                    # Entry point
│
├── package.json
└── Dockerfile
```

### 9.2 Route Configuration

```jsx
// App.js
<Routes>
  {/* Public */}
  <Route path="/login" element={<Login />} />

  {/* Protected - All authenticated users */}
  <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/levels" element={<ProtectedRoute><LevelsPage /></ProtectedRoute>} />
  <Route path="/levels/:levelId/spots" element={<ProtectedRoute><SpotsPage /></ProtectedRoute>} />

  {/* User routes */}
  <Route path="/create-ticket" element={<UserRoute><CreateTicket /></UserRoute>} />
  <Route path="/schedule-parking" element={<UserRoute><ScheduleParking /></UserRoute>} />
  <Route path="/reservations" element={<UserRoute><MyReservations /></UserRoute>} />
  <Route path="/my-tickets" element={<UserRoute><MyTickets /></UserRoute>} />
  <Route path="/tickets/:id" element={<UserRoute><TicketDetails /></UserRoute>} />

  {/* Admin routes */}
  <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
  <Route path="/admin/levels" element={<AdminRoute><ManageLevels /></AdminRoute>} />
  <Route path="/admin/vehicles" element={<AdminRoute><VehiclesPage /></AdminRoute>} />
  <Route path="/entry" element={<AdminRoute><VehicleEntryPage /></AdminRoute>} />
  <Route path="/exit" element={<AdminRoute><VehicleExitPage /></AdminRoute>} />
</Routes>
```

### 9.3 Authentication Context

```javascript
// context/AuthContext.js
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Default users for demo
  const users = [
    { email: 'admin@parking.com', password: 'admin123', role: 'ADMIN' },
    { email: 'user@parking.com', password: 'user123', role: 'USER' }
  ];

  const login = (email, password) => {
    const found = users.find(u => u.email === email && u.password === password);
    if (found) {
      setUser(found);
      localStorage.setItem('token', 'demo-token');
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  const isAdmin = () => user?.role === 'ADMIN';
  const isUser = () => user?.role === 'USER' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isUser }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 9.4 Axios Configuration

```javascript
// api/axiosConfig.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000
});

// Request interceptor - add auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 9.5 API Service Example

```javascript
// api/ticketService.js
import api from './axiosConfig';

export const ticketService = {
  // User operations
  createTicket: (data) => api.post('/ticketing/user/create', data),
  getMyTickets: (email) => api.get(`/ticketing/user/tickets?email=${email}`),
  getActiveTickets: (email) => api.get(`/ticketing/user/tickets/active?email=${email}`),
  getTicket: (id, email) => api.get(`/ticketing/user/tickets/${id}?email=${email}`),
  exitVehicle: (ticketId, email) => api.put(`/ticketing/user/exit/${ticketId}?email=${email}`),

  // Admin operations
  getAllTickets: () => api.get('/ticketing/admin/tickets'),
  getStats: () => api.get('/ticketing/admin/stats'),
  adminExit: (ticketId) => api.put(`/ticketing/admin/exit/${ticketId}`)
};
```

---

## 10. Docker Configuration

### 10.1 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ========================
  # DATABASE LAYER
  # ========================
  db:
    image: postgres:15
    container_name: parking-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: Uday@2003
      POSTGRES_DB: ticketing_service
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ========================
  # CACHE LAYER
  # ========================
  redis:
    image: redis:7-alpine
    container_name: redis-cache
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ========================
  # INFRASTRUCTURE
  # ========================
  config-server:
    build: ./backend-service/config-server
    container_name: config-server
    ports:
      - "8886:8886"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8886/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 5

  discovery-server:
    build: ./backend-service/discovery-server
    container_name: discovery-server
    ports:
      - "8761:8761"
    depends_on:
      config-server:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8761/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 5

  api-gateway:
    build: ./backend-service/api-gateway
    container_name: api-gateway
    ports:
      - "8080:8080"
    depends_on:
      discovery-server:
        condition: service_healthy

  # ========================
  # MICROSERVICES
  # ========================
  vehicle-service:
    build: ./backend-service/vehicle-service
    container_name: vehicle-service
    ports:
      - "8081:8081"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      discovery-server:
        condition: service_healthy

  ticketing-service:
    build: ./backend-service/ticketing-service
    container_name: ticketing-service
    ports:
      - "8082:8082"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      discovery-server:
        condition: service_healthy

  payment-service:
    build: ./backend-service/payment-service
    container_name: payment-service
    ports:
      - "8083:8083"
    depends_on:
      db:
        condition: service_healthy
      discovery-server:
        condition: service_healthy

  parking-lot-service:
    build: ./backend-service/parking-lot-service
    container_name: parking-lot-service
    ports:
      - "8084:8084"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      discovery-server:
        condition: service_healthy

  notification-service:
    build: ./backend-service/notification-service
    container_name: notification-service
    ports:
      - "8085:8085"
    depends_on:
      db:
        condition: service_healthy
      discovery-server:
        condition: service_healthy

  # ========================
  # FRONTEND
  # ========================
  frontend:
    build: ./frontend-service
    container_name: frontend
    ports:
      - "3000:3000"
    depends_on:
      - api-gateway

volumes:
  postgres_data:
  redis_data:
```

### 10.2 Service Dockerfile (Example)

```dockerfile
# backend-service/parking-lot-service/Dockerfile

# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 10.3 Frontend Dockerfile

```dockerfile
# frontend-service/Dockerfile
FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 11. Resilience Patterns

### 11.1 Circuit Breaker Configuration

```properties
# application.properties

# Vehicle Service Circuit Breaker
resilience4j.circuitbreaker.instances.vehicleService.failure-rate-threshold=50
resilience4j.circuitbreaker.instances.vehicleService.sliding-window-size=10
resilience4j.circuitbreaker.instances.vehicleService.wait-duration-in-open-state=10s

# Ticketing Service Circuit Breaker
resilience4j.circuitbreaker.instances.ticketingService.failure-rate-threshold=50
resilience4j.circuitbreaker.instances.ticketingService.sliding-window-size=10

# Payment Service Circuit Breaker
resilience4j.circuitbreaker.instances.paymentService.failure-rate-threshold=50
```

### 11.2 Retry Configuration

```properties
# Retry settings
resilience4j.retry.instances.vehicleService.max-attempts=3
resilience4j.retry.instances.vehicleService.wait-duration=2s

resilience4j.retry.instances.ticketingService.max-attempts=3
resilience4j.retry.instances.ticketingService.wait-duration=2s

resilience4j.retry.instances.paymentService.max-attempts=3
resilience4j.retry.instances.paymentService.wait-duration=2s
```

### 11.3 Usage Example

```java
@CircuitBreaker(name = "paymentService", fallbackMethod = "paymentFallback")
@Retry(name = "paymentService")
public void processPayment(Long ticketId, double amount) {
    PaymentRequest request = new PaymentRequest(ticketId, amount);

    PaymentResponse response = loadBalancedWebClient.post()
        .uri("http://PAYMENT-SERVICE:8083/payments/create")
        .bodyValue(request)
        .retrieve()
        .bodyToMono(PaymentResponse.class)
        .block();

    if (!"SUCCESS".equals(response.getStatus())) {
        throw new IllegalStateException("Payment failed");
    }
}

// Fallback method
public void paymentFallback(Long ticketId, double amount, Throwable ex) {
    throw new IllegalStateException("Payment service unavailable. Exit denied.", ex);
}
```

---

## 12. Security

### 12.1 Current Implementation (Demo)

- **Authentication**: Simple token stored in localStorage
- **Authorization**: Role-based (ADMIN, USER) with frontend route guards
- **Default Users**:
  - `admin@parking.com` / `admin123` (ADMIN)
  - `user@parking.com` / `user123` (USER)

### 12.2 Security Considerations for Production

1. **Implement JWT Authentication**
   - Add authentication service
   - Use JWT tokens with expiry
   - Implement refresh token mechanism

2. **Add Backend Authorization**
   - Spring Security configuration
   - Role-based endpoint protection
   - Method-level security

3. **Enable HTTPS**
   - TLS certificates
   - Force HTTPS redirects

4. **Secure Sensitive Data**
   - Externalize credentials to secrets manager
   - Encrypt passwords in database
   - Remove hardcoded credentials

5. **API Security**
   - Rate limiting
   - Input validation
   - SQL injection prevention (JPA handles this)

---

## 13. Configuration Reference

### 13.1 Vehicle Service

```properties
# application.properties
spring.datasource.url=jdbc:postgresql://db:5432/vehicle_service
spring.datasource.username=postgres
spring.datasource.password=Uday@2003
spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=true
server.port=8081

# Eureka
spring.application.name=VEHICLE-SERVICE
eureka.client.service-url.defaultZone=http://discovery-server:8761/eureka
eureka.instance.hostname=vehicle-service
eureka.instance.prefer-ip-address=false

# Redis
spring.data.redis.host=redis
spring.data.redis.port=6379
spring.cache.type=redis
spring.cache.redis.time-to-live=300000
```

### 13.2 Parking Lot Service

```properties
spring.datasource.url=jdbc:postgresql://db:5432/parking_lot_service
spring.datasource.username=postgres
spring.datasource.password=Uday@2003
spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=true
server.port=8084

# Eureka
spring.application.name=PARKING-LOT-SERVICE
eureka.client.service-url.defaultZone=http://discovery-server:8761/eureka
eureka.instance.hostname=parking-lot-service

# Redis
spring.data.redis.host=redis
spring.data.redis.port=6379
spring.cache.type=redis
spring.cache.redis.time-to-live=300000

# Resilience4j
resilience4j.circuitbreaker.instances.vehicleService.failure-rate-threshold=50
resilience4j.retry.instances.vehicleService.max-attempts=3
resilience4j.retry.instances.vehicleService.wait-duration=2s

resilience4j.circuitbreaker.instances.ticketingService.failure-rate-threshold=50
resilience4j.retry.instances.ticketingService.max-attempts=3

resilience4j.circuitbreaker.instances.paymentService.failure-rate-threshold=50
resilience4j.retry.instances.paymentService.max-attempts=3
```

### 13.3 Ticketing Service

```properties
spring.datasource.url=jdbc:postgresql://db:5432/ticketing_service
spring.datasource.username=postgres
spring.datasource.password=Uday@2003
spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=true
server.port=8082

# Eureka
spring.application.name=TICKETING-SERVICE
eureka.client.service-url.defaultZone=http://discovery-server:8761/eureka
eureka.instance.hostname=ticketing-service
management.endpoints.web.exposure.include=mappings,health,info

# Redis
spring.data.redis.host=redis
spring.data.redis.port=6379
spring.cache.type=redis
spring.cache.redis.time-to-live=300000
```

### 13.4 Payment Service

```properties
spring.datasource.url=jdbc:postgresql://db:5432/payment_service
spring.datasource.username=postgres
spring.datasource.password=Uday@2003
spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
server.port=8083

# Eureka
spring.application.name=PAYMENT-SERVICE
eureka.client.service-url.defaultZone=http://discovery-server:8761/eureka
eureka.instance.hostname=payment-service

# Payment Configuration
payment.mode=MOCK
payment.mock.fail.amount=7000

# Razorpay (Production)
# razorpay.key.id=your_key_id
# razorpay.key.secret=your_key_secret
```

### 13.5 API Gateway

```yaml
# application.yml
server:
  port: 8080

spring:
  application:
    name: API-GATEWAY
  cloud:
    gateway:
      discovery:
        locator:
          enabled: true
          lower-case-service-id: true
      routes:
        - id: parking_route
          uri: lb://PARKING-LOT-SERVICE
          predicates:
            - Path=/api/parking/**
          filters:
            - RewritePath=/api/parking/(?<segment>.*), /parking/${segment}

        - id: ticketing_route
          uri: lb://TICKETING-SERVICE
          predicates:
            - Path=/api/ticketing/**
          filters:
            - RewritePath=/api/ticketing/(?<segment>.*), /ticketing/${segment}

        - id: vehicle_route
          uri: lb://VEHICLE-SERVICE
          predicates:
            - Path=/api/vehicle/**
          filters:
            - RewritePath=/api/vehicle/(?<segment>.*), /vehicle/${segment}

        - id: payments_route
          uri: lb://PAYMENT-SERVICE
          predicates:
            - Path=/api/payments/**
          filters:
            - RewritePath=/api/payments/(?<segment>.*), /payments/${segment}

        - id: reservations_route
          uri: lb://TICKETING-SERVICE
          predicates:
            - Path=/api/reservations, /api/reservations/**
          filters:
            - RewritePath=/api(?<segment>.*), ${segment}

eureka:
  client:
    service-url:
      defaultZone: http://discovery-server:8761/eureka
```

---

## Quick Reference

### Starting the Application

```bash
# Build and start all services
docker-compose up --build

# Start specific service
docker-compose up parking-lot-service

# View logs
docker-compose logs -f ticketing-service

# Stop all
docker-compose down
```

### Access Points

| Component | URL |
|-----------|-----|
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:8080 |
| Eureka Dashboard | http://localhost:8761 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| PostgreSQL | postgres | Uday@2003 |
| Admin User | admin@parking.com | admin123 |
| Regular User | user@parking.com | user123 |

---

**Document Version**: 1.0
**Last Updated**: January 2026
**Author**: ML Parking Application Team
