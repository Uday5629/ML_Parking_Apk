# Caching Strategy for Parking Management System

## Overview

This document outlines a Redis-based caching strategy for the parking management microservices. The strategy focuses on identifying safe cache points that don't require significant refactoring.

---

## 1. Cache Key Strategy

### Naming Convention
```
{service}:{entity}:{identifier}:{qualifier}
```

### Key Patterns by Service

#### parking-lot-service
| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `parking:levels:all` | 5 min | All parking levels (basic) |
| `parking:levels:details` | 2 min | All levels with spot details |
| `parking:level:{id}` | 5 min | Single level by ID |
| `parking:level:{id}:spots` | 1 min | All spots for a level |
| `parking:spots:available:{levelId}:{isDisabled}` | 30 sec | Available spots (short TTL - changes frequently) |
| `parking:stats` | 1 min | System-wide parking statistics |
| `parking:stats:admin` | 1 min | Admin statistics |

#### ticketing-service
| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `ticketing:ticket:{id}` | 2 min | Single ticket by ID |
| `ticketing:user:{email}:tickets` | 1 min | All tickets for a user |
| `ticketing:user:{email}:active` | 30 sec | Active tickets for user |
| `ticketing:admin:tickets:all` | 1 min | All tickets (admin) |
| `ticketing:admin:tickets:active` | 30 sec | All active tickets (admin) |
| `ticketing:stats` | 1 min | System statistics |

#### vehicle-service
| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `vehicle:all` | 5 min | All registered vehicles |
| `vehicle:plate:{licensePlate}` | 10 min | Vehicle by license plate |
| `vehicle:{id}` | 10 min | Vehicle by ID |

---

## 2. Safe Cache Points (No Refactoring Required)

### 2.1 parking-lot-service

#### SAFE TO CACHE (Read-only, infrequent changes)

```java
// ParkingLotService.java

// 1. getAllLevels() - Levels rarely change
@Cacheable(value = "parkingLevels", key = "'all'")
public List<ParkingLevel> getAllLevels() {
    return levelRepo.findAll();
}

// 2. getAllLevelsWithDetails() - Good for dashboard
@Cacheable(value = "parkingLevelsDetails", key = "'details'")
public List<LevelResponse> getAllLevelsWithDetails() {
    return levelRepo.findAll().stream()
            .map(this::mapToLevelResponse)
            .collect(Collectors.toList());
}

// 3. getParkingStats() - Expensive query, can tolerate staleness
@Cacheable(value = "parkingStats", key = "'system'")
public ParkingStatsResponse getParkingStats() {
    // ... existing implementation
}
```

#### CACHE WITH EVICTION (Write operations need cache invalidation)

```java
// When creating a level, evict level caches
@Transactional(rollbackFor = Exception.class)
@CacheEvict(value = {"parkingLevels", "parkingLevelsDetails", "parkingStats"}, allEntries = true)
public LevelResponse createLevelWithSpots(LevelRequest request) {
    // ... existing implementation
}

// When adding spot, evict related caches
@Transactional(rollbackFor = Exception.class)
@CacheEvict(value = {"parkingLevelsDetails", "parkingStats"}, allEntries = true)
public SpotResponse addSpotToLevel(Long levelId, SpotRequest spotRequest) {
    // ... existing implementation
}

// When enabling/disabling spot
@Transactional
@CacheEvict(value = {"parkingLevelsDetails", "parkingStats"}, allEntries = true)
public SpotResponse enableSpot(Long spotId) {
    // ... existing implementation
}

@Transactional
@CacheEvict(value = {"parkingLevelsDetails", "parkingStats"}, allEntries = true)
public SpotResponse disableSpot(Long spotId) {
    // ... existing implementation
}
```

#### DO NOT CACHE (High mutation rate, consistency critical)

```java
// These methods should NOT be cached:

// - occupySpot() - Real-time, race condition sensitive
// - releaseSpot() - Real-time, consistency critical
// - allocateSpot() - Uses pessimistic locking, must hit DB
// - getAvailableSpots() - Changes frequently, short-lived data
```

---

### 2.2 ticketing-service

#### SAFE TO CACHE

```java
// ticketService.java

// 1. getTicket() - Single ticket lookup (with eviction on update)
@Cacheable(value = "tickets", key = "#ticketId")
public Ticket getTicket(Long ticketId) {
    return ticketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));
}

// 2. getUserTicket() - With ownership validation
@Cacheable(value = "userTickets", key = "#ticketId + ':' + #userEmail")
public TicketResponse getUserTicket(Long ticketId, String userEmail) {
    Ticket ticket = ticketRepository.findByIdAndUserEmail(ticketId, userEmail)
            .orElseThrow(() -> new RuntimeException("Ticket not found or access denied"));
    return mapToResponse(ticket);
}

// 3. getSystemStats() - Aggregate stats, can be stale
@Cacheable(value = "ticketingStats", key = "'system'")
public SystemStatsResponse getSystemStats() {
    // ... existing implementation
}

// 4. getAllTickets() - Admin view, can be slightly stale
@Cacheable(value = "adminTickets", key = "'all'")
public List<TicketResponse> getAllTickets() {
    return ticketRepository.findAllByOrderByEntryTimeDesc()
            .stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
}
```

#### CACHE WITH EVICTION

```java
// When creating ticket
@Transactional
@CacheEvict(value = {"adminTickets", "ticketingStats", "userTickets"}, allEntries = true)
public Ticket createTicket(CreateTicketRequest request) {
    // ... existing implementation
}

// When exiting vehicle
@Transactional
@Caching(evict = {
    @CacheEvict(value = "tickets", key = "#ticketId"),
    @CacheEvict(value = "adminTickets", allEntries = true),
    @CacheEvict(value = "ticketingStats", allEntries = true),
    @CacheEvict(value = "userTickets", allEntries = true)
})
public TicketResponse exitUserVehicle(Long ticketId, String userEmail) {
    // ... existing implementation
}
```

#### DO NOT CACHE

```java
// These should NOT be cached:

// - getUserActiveTickets() - Real-time status needed
// - getAllActiveTickets() - Real-time status needed
// - findByVehicleNumberAndExitTimeIsNull() - Critical for duplicate check
```

---

### 2.3 vehicle-service

#### SAFE TO CACHE (Vehicles change infrequently)

```java
// VehicleService.java

// 1. getAllVehicles() - Good cache candidate
@Cacheable(value = "vehicles", key = "'all'")
public List<Vehicle> getAllVehicles() {
    return repo.findAll();
}

// 2. getVehicleByLicense() - Frequent lookup, rarely changes
@Cacheable(value = "vehicleByPlate", key = "#licensePlate")
public List<Vehicle> getVehicleByLicense(String licensePlate) {
    return repo.findByLicensePlate(licensePlate);
}
```

#### CACHE WITH EVICTION

```java
// When saving vehicle
@CacheEvict(value = {"vehicles", "vehicleByPlate"}, allEntries = true)
public Vehicle saveVehicle(Vehicle vehicle) {
    return repo.save(vehicle);
}

// When deleting vehicle
@CacheEvict(value = {"vehicles", "vehicleByPlate"}, allEntries = true)
public void deleteVehicle(Long id) {
    repo.deleteById(id);
}
```

---

## 3. API Gateway Cache (HTTP Response Caching)

For frequently accessed, read-heavy endpoints, add response caching at the gateway level.

### Recommended Endpoints for Gateway Cache

| Endpoint | Cache Duration | Reason |
|----------|---------------|--------|
| `GET /api/parking/levels` | 60 seconds | Level structure rarely changes |
| `GET /api/parking/stats` | 30 seconds | Aggregate data, can be stale |
| `GET /api/vehicle/all` | 120 seconds | Vehicle list changes infrequently |

### NOT Recommended for Gateway Cache

| Endpoint | Reason |
|----------|--------|
| `GET /api/parking/levels/details` | Contains real-time spot availability |
| `GET /api/ticketing/user/tickets/active` | Must be real-time |
| `POST/PUT` endpoints | Write operations |

---

## 4. Redis Configuration

### Docker Compose Addition

```yaml
# Add to docker-compose.yml
redis:
  image: redis:7-alpine
  container_name: redis-cache
  ports:
    - "6379:6379"
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
  volumes:
    - redis_data:/data

volumes:
  redis_data:
```

### Spring Boot Dependencies (per service)

```xml
<!-- Add to pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

### Application Properties (per service)

```properties
# Redis Configuration
spring.redis.host=redis
spring.redis.port=6379

# Cache Configuration
spring.cache.type=redis
spring.cache.redis.time-to-live=300000
spring.cache.redis.cache-null-values=false
```

### Cache Configuration Class

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));

        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // Custom TTLs per cache
        cacheConfigs.put("parkingLevels", defaultConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigs.put("parkingLevelsDetails", defaultConfig.entryTtl(Duration.ofMinutes(2)));
        cacheConfigs.put("parkingStats", defaultConfig.entryTtl(Duration.ofMinutes(1)));
        cacheConfigs.put("tickets", defaultConfig.entryTtl(Duration.ofMinutes(2)));
        cacheConfigs.put("ticketingStats", defaultConfig.entryTtl(Duration.ofMinutes(1)));
        cacheConfigs.put("vehicles", defaultConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigs.put("vehicleByPlate", defaultConfig.entryTtl(Duration.ofMinutes(10)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}
```

---

## 5. Cache Safety Analysis

### Entity Mutability Analysis

| Entity | Mutation Frequency | Cache Safety |
|--------|-------------------|--------------|
| `ParkingLevel` | Low (admin only) | SAFE - 5 min TTL |
| `ParkingSpot.status` | High (every entry/exit) | UNSAFE for status |
| `ParkingSpot.config` | Low (admin only) | SAFE - structure only |
| `Ticket (ACTIVE)` | Changes on exit | UNSAFE - short TTL |
| `Ticket (CLOSED)` | Immutable | SAFE - long TTL |
| `Vehicle` | Low (registration) | SAFE - 10 min TTL |

### Consistency vs Performance Trade-offs

| Cache | Staleness Tolerance | Risk if Stale |
|-------|---------------------|---------------|
| Parking Levels | 5 minutes | Low - structure rarely changes |
| Parking Stats | 1 minute | Low - dashboard display |
| Available Spots | 30 seconds | Medium - could show unavailable spot |
| Active Tickets | Not cacheable | High - double booking possible |
| Vehicle Registry | 10 minutes | Low - lookup only |

---

## 6. Implementation Priority

### Phase 1 - High Impact, Low Risk
1. `vehicle-service`: Cache all vehicles and by-plate lookups
2. `parking-lot-service`: Cache `getAllLevels()` and `getParkingStats()`
3. `ticketing-service`: Cache `getSystemStats()`

### Phase 2 - Medium Impact
1. `ticketing-service`: Cache closed tickets by ID
2. `parking-lot-service`: Cache `getAllLevelsWithDetails()`

### Phase 3 - Requires More Testing
1. Gateway-level response caching for GET endpoints
2. User-specific ticket caching with proper eviction

---

## 7. Monitoring Recommendations

### Redis Metrics to Track
- Cache hit ratio per cache name
- Memory usage
- Key eviction rate
- Connection pool utilization

### Alerting Thresholds
- Cache hit ratio < 70%: Review TTL settings
- Memory > 80%: Consider eviction policy
- Connection errors: Check Redis health

---

## 8. Summary: Safe Cache Annotations Without Refactoring

### parking-lot-service/ParkingLotService.java

```java
// ADD @Cacheable
@Cacheable(value = "parkingLevels", key = "'all'")
public List<ParkingLevel> getAllLevels()

@Cacheable(value = "parkingLevelsDetails", key = "'details'")
public List<LevelResponse> getAllLevelsWithDetails()

@Cacheable(value = "parkingStats", key = "'system'")
public ParkingStatsResponse getParkingStats()

// ADD @CacheEvict to write methods
@CacheEvict(value = {"parkingLevels", "parkingLevelsDetails", "parkingStats"}, allEntries = true)
public LevelResponse createLevelWithSpots(...)

@CacheEvict(value = {"parkingLevelsDetails", "parkingStats"}, allEntries = true)
public SpotResponse addSpotToLevel(...)

@CacheEvict(value = {"parkingLevelsDetails", "parkingStats"}, allEntries = true)
public SpotResponse enableSpot(...)

@CacheEvict(value = {"parkingLevelsDetails", "parkingStats"}, allEntries = true)
public SpotResponse disableSpot(...)
```

### ticketing-service/ticketService.java

```java
// ADD @Cacheable
@Cacheable(value = "tickets", key = "#ticketId")
public Ticket getTicket(Long ticketId)

@Cacheable(value = "ticketingStats", key = "'system'")
public SystemStatsResponse getSystemStats()

// ADD @CacheEvict to write methods
@CacheEvict(value = {"tickets", "ticketingStats"}, allEntries = true)
public Ticket createTicket(...)

@CacheEvict(value = {"tickets", "ticketingStats"}, allEntries = true)
public TicketResponse exitUserVehicle(...)

@CacheEvict(value = {"tickets", "ticketingStats"}, allEntries = true)
public Ticket exit(...)
```

### vehicle-service/VehicleService.java

```java
// ADD @Cacheable
@Cacheable(value = "vehicles", key = "'all'")
public List<Vehicle> getAllVehicles()

@Cacheable(value = "vehicleByPlate", key = "#licensePlate")
public List<Vehicle> getVehicleByLicense(String licensePlate)

// ADD @CacheEvict to write methods
@CacheEvict(value = {"vehicles", "vehicleByPlate"}, allEntries = true)
public Vehicle saveVehicle(...)

@CacheEvict(value = {"vehicles", "vehicleByPlate"}, allEntries = true)
public void deleteVehicle(...)
```

---

## 9. Files to Modify

| Service | File | Changes |
|---------|------|---------|
| All | `pom.xml` | Add redis + cache dependencies |
| All | `application.properties` | Add redis config |
| All | New `CacheConfig.java` | Create cache configuration |
| parking-lot-service | `ParkingLotService.java` | Add cache annotations |
| ticketing-service | `ticketService.java` | Add cache annotations |
| vehicle-service | `VehicleService.java` | Add cache annotations |
| Root | `docker-compose.yml` | Add redis service |
