package com.uday.vehicleservice;

import com.uday.vehicleservice.entity.Vehicle;
import com.uday.vehicleservice.repository.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VehicleService {

    @Autowired
    private VehicleRepository repo;

    /**
     * Save vehicle - evicts all vehicle caches
     */
    @Caching(evict = {
        @CacheEvict(value = "vehicles", allEntries = true),
        @CacheEvict(value = "vehicleByPlate", allEntries = true)
    })
    public Vehicle saveVehicle(Vehicle vehicle) {
        System.out.println("Saving vehicle (cache will be evicted)");
        return repo.save(vehicle);
    }

    /**
     * Get all vehicles - cached for 5 minutes
     */
    @Cacheable(value = "vehicles", key = "'all'")
    public List<Vehicle> getAllVehicles() {
        System.out.println("Fetching all vehicles from database (cache miss)");
        return repo.findAll();
    }

    /**
     * Get vehicle by license plate - cached for 10 minutes
     */
    @Cacheable(value = "vehicleByPlate", key = "#licensePlate")
    public List<Vehicle> getVehicleByLicense(String licensePlate) {
        System.out.println("Fetching vehicle by plate from database (cache miss): " + licensePlate);
        return repo.findByLicensePlate(licensePlate);
    }

    /**
     * Delete vehicle - evicts all vehicle caches
     */
    @Caching(evict = {
        @CacheEvict(value = "vehicles", allEntries = true),
        @CacheEvict(value = "vehicleByPlate", allEntries = true)
    })
    public void deleteVehicle(Long id) {
        System.out.println("Deleting vehicle (cache will be evicted)");
        repo.deleteById(id);
    }
}
