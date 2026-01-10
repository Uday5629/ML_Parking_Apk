package com.uday.ticketingservice.Scheduler;

import com.uday.ticketingservice.Service.ReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
public class ReservationExpiryJob {

    @Autowired
    private ReservationService reservationService;

    /**
     * Run every 5 minutes to expire no-show reservations.
     * Reservations that are still in CREATED status 10 minutes after
     * their start time will be marked as EXPIRED.
     */
    @Scheduled(fixedRate = 300000) // 5 minutes in milliseconds
    public void expireNoShowReservations() {
        try {
            int expiredCount = reservationService.expireNoShowReservations();
            if (expiredCount > 0) {
                System.out.println("[Scheduler] Expired " + expiredCount + " no-show reservations");
            }
        } catch (Exception e) {
            System.err.println("[Scheduler] Error expiring reservations: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
