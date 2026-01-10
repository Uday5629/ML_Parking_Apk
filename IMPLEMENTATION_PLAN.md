# Parking Management System - Production Implementation Plan

## Overview

A production-ready parking management system with:
- **Admin Profile**: Full system access with email/password authentication
- **User Profile**: Google OAuth2 authentication with limited access

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Admin UI      │  │    User UI      │  │   Google OAuth Component    │  │
│  │   - Dashboard   │  │   - Dashboard   │  │   - Sign-in Button          │  │
│  │   - Levels Mgmt │  │   - My Tickets  │  │   - Phone Capture Modal     │  │
│  │   - Vehicles    │  │   - New Ticket  │  │   - Token Management        │  │
│  │   - All Tickets │  │   - Payment     │  │                             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                    │                                         │
│                          Axios + JWT Token                                   │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                              ┌──────▼──────┐
                              │ API Gateway │ :8080
                              │  (Routing)  │
                              └──────┬──────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
┌───────▼───────┐  ┌─────────────────▼─────────────────┐  ┌──────▼──────┐
│  Auth Service │  │         Core Services             │  │  Discovery  │
│    :8090      │  │  ┌─────────┐ ┌──────────────────┐ │  │   Server    │
│               │  │  │Parking  │ │Ticketing Service │ │  │    :8761    │
│ - JWT Issue   │  │  │Service  │ │      :8082       │ │  └─────────────┘
│ - OAuth2      │  │  │ :8081   │ └──────────────────┘ │
│ - RBAC        │  │  └─────────┘ ┌──────────────────┐ │
│ - User Mgmt   │  │              │ Payment Service  │ │
└───────┬───────┘  │              │      :8083       │ │
        │          │              └──────────────────┘ │
        │          │  ┌─────────┐ ┌──────────────────┐ │
        │          │  │Vehicle  │ │  Notification    │ │
        │          │  │Service  │ │    Service       │ │
        │          │  │ :8084   │ │      :8085       │ │
        │          │  └─────────┘ └──────────────────┘ │
        │          └──────────────────────────────────┬┘
        │                                             │
        └─────────────────────┬───────────────────────┘
                              │
                      ┌───────▼───────┐
                      │  PostgreSQL   │
                      │   Database    │
                      │    :5432      │
                      └───────────────┘
```

---

## 2. Database Schema Design

### 2.1 New Tables for Auth Service

```sql
-- =====================================================
-- AUTH SERVICE DATABASE: auth_service
-- =====================================================

-- Users table (supports both admin and OAuth users)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),          -- NULL for OAuth users
    phone_number VARCHAR(20),            -- Required for OAuth users
    full_name VARCHAR(255),
    profile_picture_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',  -- 'ADMIN' or 'USER'
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',  -- 'LOCAL' or 'GOOGLE'
    google_id VARCHAR(255) UNIQUE,       -- Google OAuth subject ID
    is_active BOOLEAN DEFAULT TRUE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,

    CONSTRAINT chk_role CHECK (role IN ('ADMIN', 'USER')),
    CONSTRAINT chk_provider CHECK (auth_provider IN ('LOCAL', 'GOOGLE')),
    CONSTRAINT chk_phone_for_google CHECK (
        auth_provider != 'GOOGLE' OR phone_number IS NOT NULL
    )
);

-- Refresh tokens for JWT rotation
CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(500),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,

    INDEX idx_refresh_user (user_id),
    INDEX idx_refresh_token (token_hash)
);

-- Audit log for security
CREATE TABLE auth_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(50) NOT NULL,  -- 'LOGIN', 'LOGOUT', 'TOKEN_REFRESH', 'PASSWORD_CHANGE'
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL,  -- 'SUCCESS', 'FAILURE'
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_audit_user ON auth_audit_log(user_id);
CREATE INDEX idx_audit_created ON auth_audit_log(created_at);
```

### 2.2 Modified Ticketing Service Schema

```sql
-- =====================================================
-- TICKETING SERVICE DATABASE: ticketing_service
-- =====================================================

-- Modified Ticket table with user association
CREATE TABLE tickets (
    id BIGSERIAL PRIMARY KEY,
    spot_id BIGINT NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    user_id BIGINT NOT NULL,              -- NEW: Links to auth_service.users
    entry_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP,
    parking_fee DECIMAL(10, 2),
    payment_status VARCHAR(20) DEFAULT 'PENDING',  -- 'PENDING', 'PAID', 'FAILED'
    payment_id VARCHAR(100),              -- Mock payment reference
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_payment_status CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED'))
);

CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_vehicle ON tickets(vehicle_number);
CREATE INDEX idx_tickets_status ON tickets(payment_status);
CREATE INDEX idx_tickets_active ON tickets(exit_time) WHERE exit_time IS NULL;
```

### 2.3 Entity Relationship Diagram (Textual)

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   users     │       │  refresh_tokens  │       │ auth_audit_log  │
├─────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (PK)     │◄──────│ user_id (FK)     │       │ id (PK)         │
│ email       │       │ token_hash       │       │ user_id (FK)────┼──►│
│ password    │       │ expires_at       │       │ action          │
│ phone       │       │ revoked_at       │       │ status          │
│ role        │       └──────────────────┘       └─────────────────┘
│ auth_provider│
│ google_id   │
└──────┬──────┘
       │
       │ user_id
       ▼
┌─────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   tickets   │       │  parking_spots   │       │ parking_levels  │
├─────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (PK)     │       │ id (PK)          │◄──────│ id (PK)         │
│ user_id(FK) │       │ level_id (FK)    │       │ name            │
│ spot_id(FK)─┼──────►│ spot_number      │       │ total_spots     │
│ vehicle_num │       │ is_occupied      │       └─────────────────┘
│ entry_time  │       │ is_disabled      │
│ exit_time   │       └──────────────────┘
│ payment_stat│
└─────────────┘
       │
       │ vehicle_number
       ▼
┌─────────────┐
│  vehicles   │
├─────────────┤
│ id (PK)     │
│ license     │
│ type        │
│ owner_name  │
└─────────────┘
```

---

## 3. API Route Mapping with Authorization

### 3.1 Auth Service APIs (NEW - Port 8090)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | PUBLIC | Admin email/password login |
| POST | `/auth/google` | PUBLIC | Google OAuth2 token exchange |
| POST | `/auth/google/complete` | USER | Complete registration (add phone) |
| POST | `/auth/refresh` | AUTHENTICATED | Refresh JWT token |
| POST | `/auth/logout` | AUTHENTICATED | Revoke refresh token |
| GET | `/auth/me` | AUTHENTICATED | Get current user profile |
| PUT | `/auth/me` | AUTHENTICATED | Update profile |

### 3.2 Admin-Only APIs

| Method | Endpoint | Service | Description |
|--------|----------|---------|-------------|
| POST | `/api/parking/levels` | Parking | Create parking level |
| PUT | `/api/parking/levels/{id}` | Parking | Update parking level |
| DELETE | `/api/parking/levels/{id}` | Parking | Delete parking level |
| GET | `/api/parking/spots/{levelId}` | Parking | View all spots |
| POST | `/api/vehicle/save` | Vehicle | Register vehicle |
| GET | `/api/vehicle/all` | Vehicle | List all vehicles |
| DELETE | `/api/vehicle/{id}` | Vehicle | Delete vehicle |
| GET | `/api/ticketing/all` | Ticketing | List ALL tickets |
| PUT | `/api/ticketing/{id}/status` | Ticketing | Update ticket status |

### 3.3 User APIs

| Method | Endpoint | Service | Description |
|--------|----------|---------|-------------|
| GET | `/api/parking/levels` | Parking | View available levels |
| GET | `/api/parking/spots/{levelId}/available` | Parking | View available spots only |
| POST | `/api/parking/entry` | Parking | Create ticket (own) |
| GET | `/api/ticketing/my` | Ticketing | List own tickets only |
| GET | `/api/ticketing/{id}` | Ticketing | View own ticket (validated) |
| POST | `/api/payments/mock` | Payment | Mock payment for own ticket |

### 3.4 API Gateway Route Configuration

```properties
# Auth Service Routes
spring.cloud.gateway.routes[0].id=auth_route
spring.cloud.gateway.routes[0].uri=lb://AUTH-SERVICE
spring.cloud.gateway.routes[0].predicates[0]=Path=/auth/**
spring.cloud.gateway.routes[0].filters[0]=RewritePath=/auth/(?<remaining>.*), /auth/${remaining}

# Existing routes with JWT validation filter
spring.cloud.gateway.routes[1].id=parking_route
spring.cloud.gateway.routes[1].uri=lb://PARKING-LOT-SERVICE
spring.cloud.gateway.routes[1].predicates[0]=Path=/api/parking/**
spring.cloud.gateway.routes[1].filters[0]=JwtAuthFilter
spring.cloud.gateway.routes[1].filters[1]=RewritePath=/api/parking/(?<remaining>.*), /parking/${remaining}

# ... similar for other services
```

---

## 4. Backend Implementation Details

### 4.1 New Auth Service Structure

```
auth-service/
├── pom.xml
├── Dockerfile
├── src/main/java/com/uday/authservice/
│   ├── AuthServiceApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java           # Spring Security config
│   │   ├── JwtConfig.java                 # JWT properties
│   │   ├── GoogleOAuthConfig.java         # Google OAuth2 settings
│   │   └── CorsConfig.java
│   ├── controller/
│   │   ├── AuthController.java            # Login, OAuth, refresh
│   │   └── UserController.java            # Profile management
│   ├── dto/
│   │   ├── LoginRequest.java
│   │   ├── LoginResponse.java
│   │   ├── GoogleAuthRequest.java
│   │   ├── PhoneRegistrationRequest.java
│   │   ├── TokenRefreshRequest.java
│   │   └── UserProfileResponse.java
│   ├── entity/
│   │   ├── User.java
│   │   ├── RefreshToken.java
│   │   └── AuthAuditLog.java
│   ├── repository/
│   │   ├── UserRepository.java
│   │   ├── RefreshTokenRepository.java
│   │   └── AuthAuditLogRepository.java
│   ├── service/
│   │   ├── AuthService.java
│   │   ├── JwtService.java
│   │   ├── GoogleOAuthService.java
│   │   ├── UserService.java
│   │   └── AuditService.java
│   ├── security/
│   │   ├── JwtAuthenticationFilter.java
│   │   ├── JwtTokenProvider.java
│   │   └── UserPrincipal.java
│   └── exception/
│       ├── AuthException.java
│       ├── TokenExpiredException.java
│       └── GlobalExceptionHandler.java
└── src/main/resources/
    └── application.properties
```

### 4.2 JWT Token Structure

```json
{
  "header": {
    "alg": "HS512",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "email": "user@example.com",
    "role": "USER",
    "iat": 1704672000,
    "exp": 1704675600
  }
}
```

### 4.3 Sample API Request/Response

#### Admin Login

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@parking.com",
  "password": "SecurePassword123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": 1,
      "email": "admin@parking.com",
      "fullName": "System Admin",
      "role": "ADMIN"
    }
  }
}
```

#### Google OAuth Login

**Request:**
```http
POST /auth/google
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (New User - Phone Required):**
```json
{
  "success": true,
  "requiresPhoneNumber": true,
  "tempToken": "temp_abc123...",
  "user": {
    "email": "user@gmail.com",
    "fullName": "John Doe",
    "profilePicture": "https://..."
  }
}
```

**Complete Registration:**
```http
POST /auth/google/complete
Authorization: Bearer temp_abc123...
Content-Type: application/json

{
  "phoneNumber": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "...",
    "user": {
      "id": 5,
      "email": "user@gmail.com",
      "fullName": "John Doe",
      "phoneNumber": "+919876543210",
      "role": "USER"
    }
  }
}
```

#### Create Ticket (User)

**Request:**
```http
POST /api/parking/entry
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
Content-Type: application/json

{
  "levelId": 1,
  "vehicleNumber": "KA01AB1234",
  "isDisabled": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ticketId": 42,
    "spotId": 15,
    "vehicleNumber": "KA01AB1234",
    "entryTime": "2024-01-08T10:30:00Z",
    "levelName": "Ground Floor",
    "spotNumber": "G-15"
  }
}
```

#### Mock Payment

**Request:**
```http
POST /api/payments/mock
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9...
Content-Type: application/json

{
  "ticketId": 42,
  "amount": 50.00,
  "simulateFailure": false
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "paymentId": "MOCK_PAY_1704672000_42",
    "status": "SUCCESS",
    "amount": 50.00,
    "ticketId": 42,
    "paidAt": "2024-01-08T12:30:00Z"
  }
}
```

---

## 5. Frontend Implementation

### 5.1 Updated Project Structure

```
frontend-service/
├── public/
├── src/
│   ├── api/
│   │   ├── axiosConfig.js           # Axios with interceptors
│   │   ├── authService.js           # Auth API calls
│   │   ├── parkingLotService.js
│   │   ├── ticketService.js
│   │   ├── vehicleService.js
│   │   └── paymentService.js
│   ├── context/
│   │   └── AuthContext.js           # Auth state management
│   ├── components/
│   │   ├── common/
│   │   │   ├── NavBar.js
│   │   │   ├── Loading.js
│   │   │   ├── ErrorMessage.js
│   │   │   └── ProtectedRoute.js
│   │   ├── auth/
│   │   │   ├── GoogleLoginButton.js
│   │   │   ├── PhoneNumberModal.js
│   │   │   └── AdminLoginForm.js
│   │   └── admin/
│   │       └── AdminNavBar.js
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.js         # Combined login page
│   │   │   └── CompleteProfilePage.js
│   │   ├── admin/
│   │   │   ├── AdminDashboard.js
│   │   │   ├── ManageLevels.js
│   │   │   ├── ManageVehicles.js
│   │   │   └── AllTickets.js
│   │   └── user/
│   │       ├── UserDashboard.js
│   │       ├── MyTickets.js
│   │       ├── CreateTicket.js
│   │       └── PaymentPage.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useGoogleLogin.js
│   ├── utils/
│   │   ├── tokenStorage.js
│   │   └── roleGuard.js
│   ├── App.js
│   └── index.js
├── package.json
├── .env.example
└── Dockerfile
```

### 5.2 Login Page Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      LOGIN PAGE                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Parking Management System               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [Tab: User Login]     [Tab: Admin Login]           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ══════════════ USER TAB (Default) ══════════════           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         [G] Continue with Google                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ══════════════ ADMIN TAB ══════════════                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Email:    [________________________]                │    │
│  │  Password: [________________________]                │    │
│  │                                                      │    │
│  │            [ Sign In as Admin ]                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────────┐
│ Google OAuth    │          │ Validate Credentials│
│ Popup/Redirect  │          │ with Backend        │
└────────┬────────┘          └──────────┬──────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────────┐
│ First Login?    │          │ Admin Dashboard     │
│ → Phone Modal   │          │ (Full Access)       │
│ Returning?      │          └─────────────────────┘
│ → User Dashboard│
└─────────────────┘
```

### 5.3 Role-Based Route Protection

```jsx
// App.js - Route configuration

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />

          {/* User Routes (USER or ADMIN) */}
          <Route element={<ProtectedRoute allowedRoles={['USER', 'ADMIN']} />}>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/create-ticket" element={<CreateTicket />} />
            <Route path="/payment/:ticketId" element={<PaymentPage />} />
          </Route>

          {/* Admin Only Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/levels" element={<ManageLevels />} />
            <Route path="/admin/vehicles" element={<ManageVehicles />} />
            <Route path="/admin/tickets" element={<AllTickets />} />
          </Route>

          {/* Default redirect based on role */}
          <Route path="/" element={<RoleBasedRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

---

## 6. Security Best Practices

### 6.1 Authentication Security

| Practice | Implementation |
|----------|----------------|
| Password Hashing | BCrypt with cost factor 12 |
| JWT Signing | HS512 with 256-bit secret |
| Token Expiry | Access: 1 hour, Refresh: 7 days |
| Refresh Token Rotation | New refresh token on each use |
| Token Storage | HttpOnly cookies (preferred) or secure localStorage |

### 6.2 Authorization Security

| Practice | Implementation |
|----------|----------------|
| RBAC Enforcement | JWT claims + database role check |
| Resource Ownership | Validate user_id matches token |
| API Rate Limiting | 100 requests/minute per user |
| Input Validation | Bean Validation + custom validators |
| SQL Injection | JPA parameterized queries |
| XSS Prevention | Content-Security-Policy headers |

### 6.3 OAuth Security

| Practice | Implementation |
|----------|----------------|
| Token Verification | Verify Google ID token signature |
| Nonce/State | CSRF protection for OAuth flow |
| Scope Limitation | Only request email + profile |
| Token Expiry Check | Validate exp claim |

### 6.4 Infrastructure Security

```properties
# CORS Configuration
cors.allowed-origins=https://yourdomain.com
cors.allowed-methods=GET,POST,PUT,DELETE
cors.allowed-headers=Authorization,Content-Type
cors.max-age=3600

# Security Headers
server.servlet.session.cookie.secure=true
server.servlet.session.cookie.http-only=true
server.servlet.session.cookie.same-site=strict

# Rate Limiting (using Resilience4j)
resilience4j.ratelimiter.instances.auth.limitForPeriod=10
resilience4j.ratelimiter.instances.auth.limitRefreshPeriod=1m
```

---

## 7. Step-by-Step Implementation Plan

### Phase 1: Backend Auth Service (Week 1)

1. **Create auth-service module**
   - Set up Spring Boot project with dependencies
   - Configure database connection (auth_service DB)
   - Implement User, RefreshToken entities

2. **Implement JWT infrastructure**
   - JwtTokenProvider for token generation/validation
   - JwtAuthenticationFilter for request filtering
   - SecurityConfig with endpoint rules

3. **Admin authentication**
   - Login endpoint with email/password
   - Password hashing with BCrypt
   - JWT token issuance

4. **Google OAuth integration**
   - Add google-api-client dependency
   - Implement ID token verification
   - Handle new user registration flow

5. **Refresh token mechanism**
   - Token rotation on refresh
   - Revocation on logout
   - Cleanup scheduled job

### Phase 2: API Gateway Security (Week 1-2)

1. **JWT validation filter**
   - Extract token from Authorization header
   - Validate signature and expiry
   - Add user context to request

2. **Route authorization**
   - Role-based route filtering
   - Admin-only endpoint protection
   - User resource ownership validation

3. **Update existing services**
   - Accept user context from gateway
   - Filter tickets by user_id
   - Add user_id to new tickets

### Phase 3: Frontend Auth Integration (Week 2)

1. **Google Sign-In component**
   - Configure Google OAuth client
   - Implement sign-in button
   - Handle token exchange

2. **Phone number capture**
   - Modal for first-time users
   - Validation (format, uniqueness)
   - Complete registration flow

3. **Token management**
   - Store tokens securely
   - Auto-refresh before expiry
   - Handle 401 responses

4. **Role-based UI**
   - Different dashboards for admin/user
   - Conditional navigation items
   - Protected route components

### Phase 4: User Features (Week 2-3)

1. **User dashboard**
   - Display own tickets
   - Quick actions for new ticket

2. **Ticket creation**
   - Level selection
   - Vehicle number input
   - Success/error handling

3. **Mock payment**
   - Payment form
   - Simulate success/failure
   - Update ticket status

### Phase 5: Testing & Deployment (Week 3)

1. **Unit tests**
   - Service layer tests
   - Controller tests
   - Security tests

2. **Integration tests**
   - Auth flow tests
   - API authorization tests
   - OAuth mock tests

3. **Docker updates**
   - Add auth-service container
   - Update docker-compose
   - Environment variables

---

## 8. Environment Configuration

### Backend (.env)

```properties
# JWT Configuration
JWT_SECRET=your-256-bit-secret-key-here-change-in-production
JWT_ACCESS_EXPIRY=3600000
JWT_REFRESH_EXPIRY=604800000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_service
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password

# Admin Seed (first run only)
ADMIN_EMAIL=admin@parking.com
ADMIN_PASSWORD=SecureAdminPassword123!
```

### Frontend (.env)

```properties
REACT_APP_API_BASE=/api
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
REACT_APP_ENV=development
```

---

## 9. Deliverables Checklist

- [x] High-level architecture diagram
- [x] Database ER design
- [x] API route list with authorization mapping
- [x] Frontend ↔ backend integration strategy
- [x] Security best practices
- [x] Step-by-step implementation plan
- [ ] Auth Service implementation
- [ ] API Gateway JWT filter
- [ ] Frontend OAuth integration
- [ ] User/Admin dashboards
- [ ] Mock payment system
- [ ] Docker deployment config

---

## 10. Next Steps

To proceed with implementation, confirm:

1. **Google OAuth Setup**: Do you have a Google Cloud project with OAuth credentials?
2. **Database**: Should I create the auth_service database and migrations?
3. **Priority**: Start with backend auth service or frontend first?

I'm ready to begin implementation once you confirm the approach.
