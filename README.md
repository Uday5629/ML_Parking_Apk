# Parking Management System

A distributed, microservices-based parking management platform designed for multi-level parking facilities. The system handles real-time spot allocation, ticket lifecycle management, payment processing, and role-based access control for both end users and facility administrators.

## Table of Contents

1. [Project Overview](#project-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Core Domain Model](#core-domain-model)
4. [Key Features](#key-features)
5. [Authentication and Authorization](#authentication-and-authorization)
6. [System Design Principles](#system-design-principles)
7. [Tech Stack](#tech-stack)
8. [Scalability and Production Readiness](#scalability-and-production-readiness)
9. [Getting Started](#getting-started)
10. [Future Enhancements](#future-enhancements)

---

## Project Overview

### Problem Statement

Traditional parking facilities suffer from inefficient spot allocation, lack of real-time availability visibility, manual ticket handling, and poor audit trails. These inefficiencies lead to longer wait times, revenue leakage, and frustrating user experiences.

### Solution

This system provides a digital-first approach to parking management:

- Real-time spot availability and allocation
- Self-service ticket creation for end users
- Centralized administration for facility operators
- Complete audit trail of all parking transactions
- Role-based access ensuring data isolation between users

### Design Goals

**Scalability**: Microservices architecture allows independent scaling of high-traffic components like ticketing and spot allocation.

**Reliability**: Service isolation ensures that failures in one component (e.g., notifications) do not cascade to core operations.

**Role-Based Access**: Strict separation between user and admin capabilities with ownership validation at the API layer.

**Extensibility**: Clean domain boundaries enable future additions like reservations, dynamic pricing, or multi-facility support without architectural changes.

---

## High-Level Architecture

```
                                    +------------------+
                                    |   React Frontend |
                                    |    (Port 3000)   |
                                    +--------+---------+
                                             |
                                             v
                                    +------------------+
                                    |   API Gateway    |
                                    |    (Port 8080)   |
                                    +--------+---------+
                                             |
                    +------------------------+------------------------+
                    |                        |                        |
                    v                        v                        v
           +----------------+       +----------------+       +----------------+
           | Parking-Lot    |       |   Ticketing    |       |    Vehicle     |
           |   Service      |       |    Service     |       |    Service     |
           |  (Port 8084)   |       |  (Port 8082)   |       |  (Port 8081)   |
           +-------+--------+       +-------+--------+       +-------+--------+
                   |                        |                        |
                   +------------------------+------------------------+
                                            |
                                            v
                                   +------------------+
                                   |    PostgreSQL    |
                                   |   (Port 5432)    |
                                   +------------------+

        Supporting Services:
        +------------------+    +------------------+    +------------------+
        | Discovery Server |    |  Config Server   |    |   Notification   |
        |  (Eureka 8761)   |    |   (Port 8886)    |    |    Service       |
        +------------------+    +------------------+    |  (Port 8085)     |
                                                       +------------------+

                                                       +------------------+
                                                       |    Payment       |
                                                       |    Service       |
                                                       |  (Port 8083)     |
                                                       +------------------+
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **API Gateway** | Request routing, load balancing, cross-cutting concerns |
| **Discovery Server** | Service registry (Eureka) for dynamic service discovery |
| **Config Server** | Centralized configuration management |
| **Parking-Lot Service** | Level and spot management, availability tracking, spot status transitions |
| **Ticketing Service** | Ticket lifecycle, user ticket ownership, fee calculation |
| **Vehicle Service** | Vehicle registration and lookup |
| **Payment Service** | Payment processing integration (Razorpay) |
| **Notification Service** | Push notifications via Firebase Cloud Messaging |
| **Frontend** | React SPA with role-based UI rendering |

### Request Flow: Vehicle Entry

1. User selects parking level and available spot from frontend
2. Frontend sends `POST /ticketing/user/create` with user credentials and spot selection
3. Ticketing Service validates user ownership and spot availability
4. Ticketing Service calls Parking-Lot Service to mark spot as OCCUPIED
5. Ticket is created with ACTIVE status and entry timestamp
6. Response returns ticket details to frontend

### Request Flow: Vehicle Exit

1. User initiates exit from their ticket view
2. Frontend sends `PUT /ticketing/user/exit/{ticketId}` with user email for ownership validation
3. Ticketing Service validates that ticket belongs to requesting user
4. Fee is calculated based on duration
5. Parking-Lot Service is called to release spot (AVAILABLE status)
6. Ticket status transitions to CLOSED with exit timestamp

---

## Core Domain Model

### Entity Relationships

```
+------------+       +----------------+       +---------------+
|   User     |       |    Ticket      |       | ParkingLevel  |
+------------+       +----------------+       +---------------+
| id         |<------| userId         |       | id            |
| email      |       | userEmail      |       | levelNumber   |
| name       |       | vehicleNumber  |       | name          |
| role       |       | spotId         |------>| totalSpots    |
| phone      |       | levelId        |------>+---------------+
+------------+       | entryTime      |              |
      |              | exitTime       |              | 1:N
      |              | status         |              v
      |              | fee            |       +---------------+
      |              +----------------+       | ParkingSpot   |
      |                     ^                 +---------------+
      |                     |                 | id            |
      |              +------+-------+         | spotCode      |
      |              |              |         | spotType      |
      v              |              |         | status        |
+----------------+   |              |         | levelId       |
|  Reservation   |---+              |         +---------------+
+----------------+                  |
| id             |                  |
| userId         |                  |
| userEmail      |                  |
| vehicleNumber  |                  |
| spotId         |------------------+
| levelId        |
| startTime      |
| endTime        |
| status         | (CREATED, ACTIVE, EXPIRED, CANCELLED)
| ticketId       | (linked after check-in)
+----------------+
```

### Ticket Lifecycle

```
    [Entry Request]
          |
          v
    +----------+     [Exit Request]     +----------+
    |  ACTIVE  | ------------------->   |  CLOSED  |
    +----------+                        +----------+
         |                                   |
         | - Spot is OCCUPIED                | - Spot is AVAILABLE
         | - exitTime is NULL                | - exitTime is set
         | - fee is NULL                     | - fee is calculated
```

### Spot Status State Machine

```
                    [enable()]
    +----------+ <-------------- +----------+
    | AVAILABLE|                 | DISABLED |
    +----------+ --------------> +----------+
         |         [disable()]
         |
         | [occupy()]
         v
    +----------+
    | OCCUPIED |
    +----------+
         |
         | [release()]
         v
    +----------+
    | AVAILABLE|
    +----------+
```

### Reservation Lifecycle

```
    [Create Reservation]
          |
          v
    +----------+
    |  CREATED |  (spot reserved for time window)
    +----------+
         |
    +----+----+--------------------+
    |         |                    |
    v         v                    v
[Check-in] [No-show]         [User Cancel]
    |      (10 min grace)          |
    v         |                    v
+--------+    |             +-----------+
| ACTIVE |    |             | CANCELLED |
+--------+    |             +-----------+
    |         v
    |    +----------+
    |    | EXPIRED  |
    |    +----------+
    |
    v
[Ticket closed via normal exit flow]
```

### Domain Invariants

1. **One Active Ticket Per Spot**: A spot in OCCUPIED status can have exactly one ACTIVE ticket
2. **User Ticket Ownership**: Users can only view, modify, or exit their own tickets
3. **Spot Availability Guard**: A ticket cannot be created for a spot that is not AVAILABLE
4. **Disabled Spot Protection**: Disabled spots cannot be occupied until explicitly enabled by admin
5. **Exit Requires Active Status**: Only ACTIVE tickets can be exited
6. **Reservation Conflict Prevention**: No overlapping reservations for the same spot or same vehicle
7. **Reservation Time Limits**: Max 3 days in advance, max 4 hours duration, 30-min slot alignment
8. **Check-in Window**: Users can only check-in within ±10 minutes of reservation start time

---

## Key Features

### User Capabilities

| Feature | Description |
|---------|-------------|
| **Create Parking Ticket** | Select level and spot, provide vehicle number, receive ticket confirmation |
| **Schedule Parking** | Reserve spots up to 3 days in advance with configurable time slots (30 min - 4 hours) |
| **View My Reservations** | List all reservations with filter by upcoming/active/past status |
| **Check-In to Reservation** | Convert reservation to active ticket within ±10 min window of scheduled start |
| **View My Tickets** | List all tickets with filtering by active/closed status |
| **Exit Vehicle** | Close active ticket, release spot, view calculated fee |
| **View Parking Availability** | Real-time view of available spots per level |
| **View System Status** | Overall parking statistics (total spots, availability) |

### Admin Capabilities

| Feature | Description |
|---------|-------------|
| **Manage Parking Levels** | Create levels with spot distribution (CAR, BIKE, EV, HANDICAPPED) |
| **Manage Parking Spots** | Enable/disable individual spots, add spots to existing levels |
| **View All Tickets** | System-wide ticket visibility with filtering |
| **View All Vehicles** | Complete vehicle registry |
| **Monitor System Status** | Dashboard with occupancy rates, active vehicles, level-wise breakdown |
| **Vehicle Entry/Exit Operations** | Admin-initiated parking operations |

---

## Authentication and Authorization

### Authentication Methods

| Role | Method | Details |
|------|--------|---------|
| **User** | OAuth2 (Google) | Production-ready with simulated email/password for development |
| **Admin** | Email/Password | Direct credential authentication |

### JWT Token Structure

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "role": "USER | ADMIN",
  "exp": "expiration_timestamp"
}
```

Tokens are stored in localStorage and included in API requests via Authorization header.

### Role-Based Access Control

```
Endpoint Pattern          | USER | ADMIN |
--------------------------|------|-------|
GET  /parking/levels      |  Y   |   Y   |
GET  /parking/stats       |  Y   |   Y   |
POST /ticketing/user/*    |  Y   |   N   |
PUT  /ticketing/user/*    |  Y   |   N   |
GET  /ticketing/admin/*   |  N   |   Y   |
PUT  /parking/admin/*     |  N   |   Y   |
POST /parking/levels/*    |  N   |   Y   |
```

### Ownership Validation

User endpoints enforce ownership at the service layer:

```java
// Example: User can only exit their own tickets
public TicketResponse exitUserVehicle(Long ticketId, String userEmail) {
    Ticket ticket = ticketRepository.findByIdAndUserEmail(ticketId, userEmail)
        .orElseThrow(() -> new TicketNotFoundException("Ticket not found or access denied"));
    // ... exit logic
}
```

---

## System Design Principles

### Service Isolation

Each microservice owns its data and exposes functionality through well-defined APIs. Services communicate synchronously via REST for transactional operations. This isolation ensures:

- Independent deployment and scaling
- Technology flexibility per service
- Fault isolation

### Transactional Safety

Critical operations use Spring's `@Transactional` annotation to ensure atomicity:

```java
@Transactional
public LevelResponse createLevelWithSpots(LevelRequest request) {
    // Validate level doesn't exist
    // Create level
    // Generate and save all spots
    // Return complete level with spots
    // Rollback entire operation on any failure
}
```

### State Machine Enforcement

Domain entities enforce valid state transitions:

```java
public void occupy() {
    if (status == SpotStatus.DISABLED) {
        throw new IllegalStateException("Cannot occupy a disabled spot");
    }
    this.status = SpotStatus.OCCUPIED;
}
```

### Idempotent Operations

Exit operations check current state before processing:

```java
if (ticket.getStatus() == TicketStatus.CLOSED) {
    return mapToResponse(ticket); // Already closed, return current state
}
```

### API Versioning Strategy

APIs are versioned through URL path structure. Current version uses implicit v1 through path conventions (`/parking/*`, `/ticketing/*`). Future versions can coexist via explicit version prefixes.

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | Component-based UI with hooks for state management |
| **React Router 6** | Client-side routing with role-based route guards |
| **Bootstrap 5** | Responsive styling without custom CSS complexity |
| **Axios** | HTTP client with interceptor support for auth headers |

### Backend

| Technology | Purpose |
|------------|---------|
| **Spring Boot 3** | Microservice framework with embedded server |
| **Spring Cloud Gateway** | API gateway with routing and filtering |
| **Spring Cloud Netflix Eureka** | Service discovery and registration |
| **Spring Cloud Config** | Externalized configuration management |
| **Spring Data JPA** | ORM with repository pattern |
| **Lombok** | Boilerplate reduction for entities and DTOs |

### Data

| Technology | Purpose |
|------------|---------|
| **PostgreSQL 15** | Primary relational database with ACID guarantees |
| **JPA/Hibernate** | Object-relational mapping |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization for all services |
| **Docker Compose** | Multi-container orchestration for local development |

### Integrations

| Technology | Purpose |
|------------|---------|
| **Razorpay** | Payment gateway integration |
| **Firebase Cloud Messaging** | Push notification delivery |

---

## Scalability and Production Readiness

### Horizontal Scaling

The microservices architecture enables independent scaling:

- **Ticketing Service**: Scale during peak entry/exit hours
- **Parking-Lot Service**: Scale for high-frequency availability queries
- **API Gateway**: Scale as request volume increases

Eureka service discovery enables automatic load balancing across service instances.

### Failure Handling

| Failure Type | Handling Strategy |
|--------------|-------------------|
| Service unavailable | Gateway returns 503, frontend shows appropriate error |
| Database connection | Connection pooling with retry logic |
| Network timeout | Configurable timeouts at gateway level |
| Validation failures | Structured error responses with field-level details |

### Observability

Current implementation provides:

- Application logs via SLF4J/Logback
- Eureka dashboard for service health
- Database query logging in development mode

Production recommendations:

- Centralized logging (ELK stack or similar)
- Distributed tracing (Zipkin/Jaeger)
- Metrics collection (Prometheus/Grafana)
- Health check endpoints (`/actuator/health`)

### Security Considerations

| Area | Implementation |
|------|----------------|
| **Authentication** | JWT tokens with expiration |
| **Authorization** | Role-based access control at route and service level |
| **Data Isolation** | User queries filtered by ownership |
| **Input Validation** | Bean validation on all request DTOs |
| **SQL Injection** | Parameterized queries via JPA |
| **CORS** | Configured at gateway level |

Production recommendations:

- HTTPS enforcement
- Token refresh mechanism
- Rate limiting at gateway
- Secrets management (Vault or similar)

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ and npm (for frontend development)
- Java 17+ (for backend development)

### Running with Docker Compose

```bash
# Start all backend services
cd backend-service
docker-compose up -d

# Wait for services to register with Eureka (approximately 60 seconds)
# Verify at http://localhost:8761

# Start frontend
cd ../frontend-service
npm install
npm start
```

### Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:8080 |
| Eureka Dashboard | http://localhost:8761 |

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@parking.com | admin123 |
| User | user@parking.com | user123 |

### Environment Variables

Backend services read configuration from Spring Cloud Config Server. Key variables can be overridden:

| Variable | Description |
|----------|-------------|
| `SPRING_DATASOURCE_URL` | PostgreSQL connection URL |
| `SPRING_DATASOURCE_USERNAME` | Database username |
| `SPRING_DATASOURCE_PASSWORD` | Database password |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | Eureka server URL |
| `RAZORPAY_KEY_ID` | Payment gateway key (payment-service) |
| `RAZORPAY_KEY_SECRET` | Payment gateway secret (payment-service) |

---

## Future Enhancements

### Dynamic Pricing

Implement variable pricing based on:

- Time of day (peak hours)
- Duration tiers
- Spot type premiums (EV charging, accessible)
- Occupancy-based surge pricing

### Multi-Tenant Support

Enable single deployment to serve multiple parking facilities:

- Tenant isolation at data layer
- Tenant-specific configuration
- Cross-tenant reporting for facility chains

### Vehicle Recognition Integration

Integrate with ANPR (Automatic Number Plate Recognition) systems:

- Automatic vehicle identification at entry/exit
- Reduce manual ticket handling
- Enable barrier automation

### Mobile Applications

Native mobile apps for iOS and Android:

- Push notifications for ticket expiry
- QR code-based ticket display
- In-app payment processing
- Location-based parking discovery

### Analytics Dashboard

Business intelligence for facility operators:

- Occupancy trends and forecasting
- Revenue analytics
- Peak hour identification
- Spot utilization reports

---

## Project Structure

```
ML_Parking_Apk/
├── backend-service/
│   ├── api-gateway/           # Spring Cloud Gateway
│   ├── config-server/         # Spring Cloud Config
│   ├── discovery-server/      # Eureka Server
│   ├── parking-lot-service/   # Level and spot management
│   ├── ticketing-service/     # Ticket lifecycle
│   ├── vehicle-service/       # Vehicle registry
│   ├── payment-service/       # Razorpay integration
│   ├── notification-service/  # FCM integration
│   ├── init-db-scripts/       # Database initialization
│   └── docker-compose.yml     # Container orchestration
├── frontend-service/
│   ├── src/
│   │   ├── api/               # API service clients
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # React context (Auth)
│   │   └── pages/             # Route components
│   │       └── admin/         # Admin-specific pages
│   └── package.json
└── README.md
```

---

## License

This project is developed for educational and demonstration purposes.
