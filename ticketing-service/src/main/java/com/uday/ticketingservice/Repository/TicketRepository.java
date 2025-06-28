package com.uday.ticketingservice.Repository;

import com.uday.ticketingservice.Entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
}
