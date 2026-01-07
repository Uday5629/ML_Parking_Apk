package com.uday.parkinglotservice.controller;

import com.uday.parkinglotservice.DTO.TicketDetails;
import com.uday.parkinglotservice.Entity.*;
import com.uday.parkinglotservice.ParkingLotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/parking")
public class ParkingLotController {

    private final ParkingLotService service;

    @Autowired
    public ParkingLotController(ParkingLotService service) {
        this.service = service;
    }

    @GetMapping("/levels")
    public List<ParkingLevel> getLevels() {
        return service.getAllLevels();
    }

    @PostMapping("/levels")
    public ParkingLevel addLevel(@RequestBody ParkingLevel level) {
        return service.addLevel(level);
    }

    //Main ticketing logic
    @PostMapping("/entry")
    public TicketDetails vehicleEntry(
            @RequestParam Long levelId,
            @RequestParam boolean isDisabled,
            @RequestParam String vehicleNumber
    ) {
        System.out.println("Entry-endpoint was hit");
        return service.allocateSpotAndCreateTicket(levelId, isDisabled, vehicleNumber);
    }
    @PutMapping("/exit")
    public void vehicleExit(@RequestParam Long ticketId)
    {
        service.exitVehicle(ticketId);
    }

    @GetMapping("/spots/{levelId}")
    public List<ParkingSpot> getSpots(@PathVariable Long levelId,
                                      @RequestParam boolean isDisabled) {
        return service.getAvailableSpots(levelId, isDisabled);
    }
}
