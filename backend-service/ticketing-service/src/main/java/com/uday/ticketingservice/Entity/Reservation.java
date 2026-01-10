package com.uday.ticketingservice.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Duration;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "reservation",
    indexes = {
        @Index(name = "idx_reservation_user_email", columnList = "userEmail"),
        @Index(name = "idx_reservation_status", columnList = "status"),
        @Index(name = "idx_reservation_start_time", columnList = "startTime"),
        @Index(name = "idx_reservation_spot_time", columnList = "spotId, startTime, endTime")
    }
)
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
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReservationStatus status = ReservationStatus.CREATED;

    private Long ticketId; // set after check-in

    @Column(updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private static final int GRACE_MINUTES = 10;

    // check-in window: 10 min before to 10 min after start
    public boolean canCheckIn(LocalDateTime now) {
        return status == ReservationStatus.CREATED
            && now.isAfter(startTime.minusMinutes(GRACE_MINUTES))
            && now.isBefore(startTime.plusMinutes(GRACE_MINUTES));
    }

    public boolean canCancel(LocalDateTime now) {
        return status == ReservationStatus.CREATED && now.isBefore(startTime);
    }

    public boolean isExpired(LocalDateTime now) {
        return status == ReservationStatus.CREATED
            && now.isAfter(startTime.plusMinutes(GRACE_MINUTES));
    }

    public long getDurationMinutes() {
        return Duration.between(startTime, endTime).toMinutes();
    }
}
