# API Endpoints Reference

All endpoints are accessed through the **API Gateway** at `http://localhost:8080`.

---

## Parking Lot Service (`/api/parking`)

### Public/User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/parking/levels` | Get all parking levels |
| `GET` | `/api/parking/levels/details` | Get levels with spot details and counts |
| `GET` | `/api/parking/levels/{levelId}/spots/all` | Get all spots for a specific level |
| `GET` | `/api/parking/spots/{levelId}?isDisabled={boolean}` | Get available spots filtered by accessibility |
| `GET` | `/api/parking/stats` | Get system-wide parking statistics |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/parking/levels` | Create level (legacy, without spots) |
| `POST` | `/api/parking/levels/create` | Create level with spots (atomic) |
| `POST` | `/api/parking/levels/{levelId}/spots` | Add single spot to existing level |
| `PUT` | `/api/parking/admin/spots/{spotId}/enable` | Enable a disabled spot |
| `PUT` | `/api/parking/admin/spots/{spotId}/disable` | Disable a spot |
| `GET` | `/api/parking/admin/stats` | Get admin parking statistics |
| `POST` | `/api/parking/entry?levelId={id}&vehicleNumber={plate}&isDisabled={boolean}` | Process vehicle entry |
| `PUT` | `/api/parking/exit?ticketId={id}` | Process vehicle exit |

### Request/Response Models

**LevelRequest:**
```json
{
  "levelNumber": "L1",
  "name": "Ground Floor",
  "totalSpots": 20,
  "carSpots": 12,
  "bikeSpots": 4,
  "evSpots": 2,
  "handicappedSpots": 2
}
```

**SpotRequest:**
```json
{
  "spotCode": "A1",
  "spotType": "CAR",
  "isDisabled": false
}
```

**LevelResponse:**
```json
{
  "id": 1,
  "levelNumber": "L1",
  "name": "Ground Floor",
  "totalSpots": 20,
  "availableSpots": 15,
  "occupiedSpots": 5,
  "spotsByType": { "CAR": 12, "BIKE": 4, "EV": 2, "HANDICAPPED": 2 },
  "message": "Level created successfully"
}
```

**SpotResponse:**
```json
{
  "id": 1,
  "spotCode": "A1",
  "spotType": "CAR",
  "isDisabled": false,
  "isOccupied": false,
  "levelId": 1
}
```

---

## Ticketing Service (`/api/ticketing`)

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ticketing/user/create` | Create ticket for logged-in user |
| `GET` | `/api/ticketing/user/tickets?email={email}` | Get all tickets for user |
| `GET` | `/api/ticketing/user/tickets/active?email={email}` | Get active tickets for user |
| `GET` | `/api/ticketing/user/tickets/{ticketId}?email={email}` | Get specific ticket (ownership validated) |
| `PUT` | `/api/ticketing/user/exit/{ticketId}?email={email}` | Exit vehicle (ownership validated) |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ticketing/admin/tickets` | Get all tickets in system |
| `GET` | `/api/ticketing/admin/tickets/active` | Get all active tickets |
| `GET` | `/api/ticketing/admin/stats` | Get system statistics |
| `GET` | `/api/ticketing/admin/tickets/{ticketId}` | Get any ticket by ID |
| `PUT` | `/api/ticketing/admin/exit/{ticketId}` | Exit any ticket (admin override) |

### Legacy Endpoints (Backward Compatible)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ticketing` | Health check |
| `GET` | `/api/ticketing/{ticketId}` | Get ticket by ID |
| `POST` | `/api/ticketing/create?spotId={id}&vehicleNumber={plate}` | Create ticket (internal use) |
| `PUT` | `/api/ticketing/exit/{ticketId}` | Mark ticket as exited |

### Request/Response Models

**CreateTicketRequest:**
```json
{
  "userId": "1",
  "userEmail": "user@email.com",
  "vehicleNumber": "KA01AB1234",
  "spotId": 1,
  "levelId": 1
}
```

**TicketResponse:**
```json
{
  "id": 1,
  "userId": "1",
  "userEmail": "user@email.com",
  "vehicleNumber": "KA01AB1234",
  "spotId": 1,
  "levelId": 1,
  "entryTime": "2024-01-15T10:30:00",
  "exitTime": null,
  "status": "ACTIVE",
  "fee": null,
  "message": "Ticket created successfully"
}
```

---

## Reservation Service (`/api/reservations`)

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reservations` | Create a new reservation |
| `GET` | `/api/reservations?email={email}` | Get all reservations for user |
| `GET` | `/api/reservations/active?email={email}` | Get active/upcoming reservations |
| `GET` | `/api/reservations/{id}?email={email}` | Get specific reservation (ownership validated) |
| `DELETE` | `/api/reservations/{id}?email={email}` | Cancel a reservation |
| `POST` | `/api/reservations/{id}/check-in?email={email}` | Check in to reservation (creates ticket) |

### Availability Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reservations/slots?spotId={id}&date={date}` | Get available time slots for a spot on a date |
| `GET` | `/api/reservations/check-availability?spotId={id}&startTime={datetime}&endTime={datetime}` | Check if specific slot is available |
| `GET` | `/api/reservations/blocked-spots?levelId={id}` | Get spot IDs currently blocked by reservations |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reservations/admin/all` | Get all reservations in system |

### Request/Response Models

**CreateReservationRequest:**
```json
{
  "userId": "1",
  "userEmail": "user@email.com",
  "vehicleNumber": "KA01AB1234",
  "spotId": 1,
  "levelId": 1,
  "startTime": "2024-01-15T10:00:00",
  "endTime": "2024-01-15T12:00:00"
}
```

**ReservationResponse:**
```json
{
  "id": 1,
  "userId": "1",
  "userEmail": "user@email.com",
  "vehicleNumber": "KA01AB1234",
  "spotId": 1,
  "levelId": 1,
  "startTime": "2024-01-15T10:00:00",
  "endTime": "2024-01-15T12:00:00",
  "status": "CREATED",
  "ticketId": null,
  "createdAt": "2024-01-14T15:30:00",
  "canCheckIn": false,
  "canCancel": true,
  "minutesUntilStart": 1110,
  "message": "Reservation confirmed successfully"
}
```

**CheckInResponse:**
```json
{
  "reservationId": 1,
  "ticketId": 101,
  "status": "ACTIVE",
  "message": "Checked in successfully. Your parking session is now active."
}
```

**AvailableSlotsResponse:**
```json
{
  "spotId": 1,
  "date": "2024-01-15",
  "availableSlots": [
    { "start": "2024-01-15T06:00:00", "end": "2024-01-15T06:30:00" },
    { "start": "2024-01-15T06:30:00", "end": "2024-01-15T07:00:00" }
  ],
  "totalSlots": 32,
  "bookedSlots": 4
}
```

**Reservation Status Values:**
- `CREATED` - Reservation confirmed, awaiting check-in
- `ACTIVE` - User has checked in, ticket created
- `EXPIRED` - User didn't check in within grace period (10 minutes)
- `CANCELLED` - User cancelled the reservation

---

## Vehicle Service (`/api/vehicle`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/vehicle/save` | Register new vehicle |
| `GET` | `/api/vehicle/all` | Get all registered vehicles |
| `GET` | `/api/vehicle/{licensePlate}` | Get vehicle by license plate |
| `DELETE` | `/api/vehicle/{id}` | Delete vehicle by ID |

### Request/Response Models

**Vehicle:**
```json
{
  "id": 1,
  "licensePlate": "KA01AB1234",
  "type": "CAR",
  "isDisabled": false,
  "ownerName": "John Doe"
}
```

**Vehicle Types:** `CAR`, `BIKE`, `TRUCK`

---

## Payment Service (`/api/payments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/payments/create` | Create payment order |

### Request/Response Models

**PaymentRequest:**
```json
{
  "ticketId": 1,
  "amount": 150.00
}
```

**PaymentResponse:**
```json
{
  "orderId": "order_xyz123",
  "status": "SUCCESS",
  "amount": 150.00
}
```

---

## Notification Service (`/api/notifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/notifications/send?token={token}&title={title}&body={body}` | Send push notification |

---

## Example cURL Commands

### Create a Parking Level with Spots
```bash
curl -X POST http://localhost:8080/api/parking/levels/create \
  -H "Content-Type: application/json" \
  -d '{"levelNumber": "L1", "name": "Ground Floor", "totalSpots": 10, "carSpots": 6, "bikeSpots": 2, "evSpots": 1, "handicappedSpots": 1}'
```

### Get All Parking Levels with Details
```bash
curl http://localhost:8080/api/parking/levels/details
```

### Register a Vehicle
```bash
curl -X POST http://localhost:8080/api/vehicle/save \
  -H "Content-Type: application/json" \
  -d '{"licensePlate": "KA01AB1234", "type": "CAR", "ownerName": "John Doe"}'
```

### Create a User Ticket
```bash
curl -X POST http://localhost:8080/api/ticketing/user/create \
  -H "Content-Type: application/json" \
  -d '{"userId": "1", "userEmail": "user@email.com", "vehicleNumber": "KA01AB1234", "spotId": 1, "levelId": 1}'
```

### Get User Tickets
```bash
curl "http://localhost:8080/api/ticketing/user/tickets?email=user@email.com"
```

### Exit User Vehicle
```bash
curl -X PUT "http://localhost:8080/api/ticketing/user/exit/1?email=user@email.com"
```

### Vehicle Entry (Admin)
```bash
curl -X POST "http://localhost:8080/api/parking/entry?levelId=1&vehicleNumber=KA01AB1234&isDisabled=false"
```

### Vehicle Exit (Admin)
```bash
curl -X PUT "http://localhost:8080/api/parking/exit?ticketId=1"
```

### Get Parking Statistics
```bash
curl http://localhost:8080/api/parking/stats
```

### Get All Active Tickets (Admin)
```bash
curl http://localhost:8080/api/ticketing/admin/tickets/active
```

### Enable a Spot (Admin)
```bash
curl -X PUT http://localhost:8080/api/parking/admin/spots/1/enable
```

### Disable a Spot (Admin)
```bash
curl -X PUT http://localhost:8080/api/parking/admin/spots/1/disable
```

### Add Spot to Level (Admin)
```bash
curl -X POST http://localhost:8080/api/parking/levels/1/spots \
  -H "Content-Type: application/json" \
  -d '{"spotCode": "Z1", "spotType": "EV", "isDisabled": false}'
```

### Get All Vehicles
```bash
curl http://localhost:8080/api/vehicle/all
```

### Delete Vehicle
```bash
curl -X DELETE http://localhost:8080/api/vehicle/1
```

### Create Payment
```bash
curl -X POST http://localhost:8080/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{"ticketId": 1, "amount": 150.00}'
```

---

## Reservation Examples

### Create a Reservation
```bash
curl -X POST http://localhost:8080/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"userId": "1", "userEmail": "user@email.com", "vehicleNumber": "KA01AB1234", "spotId": 1, "levelId": 1, "startTime": "2024-01-15T10:00:00", "endTime": "2024-01-15T12:00:00"}'
```

### Get User Reservations
```bash
curl "http://localhost:8080/api/reservations?email=user@email.com"
```

### Get Active Reservations
```bash
curl "http://localhost:8080/api/reservations/active?email=user@email.com"
```

### Get Available Time Slots
```bash
curl "http://localhost:8080/api/reservations/slots?spotId=1&date=2024-01-15"
```

### Check Slot Availability
```bash
curl "http://localhost:8080/api/reservations/check-availability?spotId=1&startTime=2024-01-15T10:00:00&endTime=2024-01-15T12:00:00"
```

### Get Blocked Spots for a Level
```bash
curl "http://localhost:8080/api/reservations/blocked-spots?levelId=1"
```

### Check In to Reservation
```bash
curl -X POST "http://localhost:8080/api/reservations/1/check-in?email=user@email.com"
```

### Cancel Reservation
```bash
curl -X DELETE "http://localhost:8080/api/reservations/1?email=user@email.com"
```

### Get All Reservations (Admin)
```bash
curl http://localhost:8080/api/reservations/admin/all
```
