package com.uday.ticketingservice.Repository;

import com.uday.ticketingservice.Entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
    Optional<Ticket> findByVehicleNumber(String vehicleNumber);
    Optional<Ticket> findByVehicleNumberAndExitTimeIsNull(String vehicleNumber);

}
