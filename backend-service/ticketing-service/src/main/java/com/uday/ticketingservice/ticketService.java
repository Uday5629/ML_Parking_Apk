package com.uday.ticketingservice;

import com.uday.ticketingservice.Entity.Ticket;
import com.uday.ticketingservice.Repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ticketService {

    @Autowired
    private TicketRepository ticketRepository;

    public Ticket createTicket(Long spotId, String vehicleNumber) {

    //Checking for any active tickets
        Optional<Ticket> activeTicket =
                ticketRepository.findByVehicleNumberAndExitTimeIsNull(vehicleNumber);

        if (activeTicket.isPresent()) {
            System.out.println("Active ticket already exists");
            return activeTicket.get();
        }

        Ticket ticket = new Ticket();
        ticket.setSpotId(spotId);
        ticket.setVehicleNumber(vehicleNumber);
        ticket.setEntryTime(LocalDateTime.now());
        ticket.setExitTime(null);

        return ticketRepository.save(ticket);
    }

    public Ticket exit(Long ticketId) {

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Ticket not found: " + ticketId)
                );

        if (ticket.getExitTime() != null) {
            throw new IllegalStateException("Ticket already closed");
        }
        ticket.setExitTime(LocalDateTime.now());
        return ticketRepository.save(ticket);
    }

    public Ticket getTicket(Long ticketId) {
        System.out.println(ticketId);
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket not found"));
    }
}
