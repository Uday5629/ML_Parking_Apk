package com.uday.vehicleservice;

import com.uday.vehicleservice.entity.Vehicle;
import com.uday.vehicleservice.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VehicleService {

    @Autowired
    private VehicleRepository repo;

    public Vehicle saveVehicle(Vehicle vehicle) {
        return repo.save(vehicle);
    }

    public List<Vehicle> getAllVehicles() {
        return repo.findAll();
    }

    public List<Vehicle> getVehicleByLicense(String licensePlate) {
        return repo.findByLicensePlate(licensePlate);
    }

    public void deleteVehicle(Long id) {
        repo.deleteById(id);
    }
}
