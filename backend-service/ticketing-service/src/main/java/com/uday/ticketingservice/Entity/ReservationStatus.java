package com.uday.ticketingservice.Entity;

public enum ReservationStatus {
    CREATED,    // Reservation made, waiting for user to arrive
    ACTIVE,     // User checked in, parking in progress
    EXPIRED,    // User didn't show up within grace period
    CANCELLED   // User cancelled the reservation
}
