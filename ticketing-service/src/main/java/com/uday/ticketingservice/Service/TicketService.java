package com.uday.ticketingservice.Service;

import com.uday.ticketingservice.Entity.Ticket;
import com.uday.ticketingservice.Repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class TicketService {

    @Autowired
    private TicketRepository ticketRepository;

    public Ticket createTicket(String vehicleNumber) {
        Ticket ticket = Ticket.builder()
                .vehicleNumber(vehicleNumber)
                .entryTime(LocalDateTime.now())
                .build();
        return ticketRepository.save(ticket);
    }

    public Optional<Ticket> markExit(Long ticketId) {
        return ticketRepository.findById(ticketId).map(ticket -> {
            ticket.setExitTime(LocalDateTime.now());
            return ticketRepository.save(ticket);
        });
    }
}
