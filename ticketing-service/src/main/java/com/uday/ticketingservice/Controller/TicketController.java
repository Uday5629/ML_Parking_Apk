package com.uday.ticketingservice.Controller;

import com.uday.ticketingservice.Entity.Ticket;
import com.uday.ticketingservice.Service.TicketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/tickets")
public class TicketController {

    @Autowired
    private TicketService ticketService;

    @GetMapping
    public ResponseEntity<String> ticketsHome() {
        return ResponseEntity.ok("✅ Ticketing Service is up and running!");
    }

    @PostMapping("/create")
    public ResponseEntity<String> createTicket(@RequestParam String vehicleNumber) {
        return ResponseEntity.ok("Ticketing system is working"+ vehicleNumber);
    }

    @PutMapping("/exit/{id}")
    public ResponseEntity<?> markExit(@PathVariable Long id) {
        Optional<Ticket> ticket = ticketService.markExit(id);
        return ticket.isPresent() ?
                ResponseEntity.ok(ticket.get()) :
                ResponseEntity.status(HttpStatus.NOT_FOUND).body("Ticket not found");
    }
}
