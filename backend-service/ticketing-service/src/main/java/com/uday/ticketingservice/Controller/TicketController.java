package com.uday.ticketingservice.Controller;

import com.uday.ticketingservice.DTO.TicketResponse;
import com.uday.ticketingservice.Entity.Ticket;
import com.uday.ticketingservice.ticketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/ticketing")
public class TicketController {

    @Autowired
    private ticketService ticketService;

      @GetMapping
    public ResponseEntity<String> ticketsHome() {
        return ResponseEntity.ok("Ticketing Service is up and running!");
    }

    @PostMapping("/create")
    public ResponseEntity<TicketResponse> createTicket(@RequestParam Long spotId,@RequestParam String vehicleNumber) {
          System.out.println("ticket create called in controller");
        Ticket ticket = ticketService.createTicket(spotId,vehicleNumber);
        return ResponseEntity.ok(
                new TicketResponse(
                ticket.getId(),
                ticket.getSpotId(),
                ticket.getVehicleNumber(),
                ticket.getEntryTime()
                ));
    }

    @PutMapping("/exit/{ticketId}")
    public ResponseEntity<Ticket> exit(@PathVariable Long ticketId) {
        return ResponseEntity.ok(ticketService.exit(ticketId));
    }

    @GetMapping("/{ticketId}")
    public Ticket getTicket(@PathVariable Long ticketId) {
        return ticketService.getTicket(ticketId);
    }
}
