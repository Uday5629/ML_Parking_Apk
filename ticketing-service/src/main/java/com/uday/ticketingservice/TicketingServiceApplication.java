package com.uday.ticketingservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@EnableDiscoveryClient
@SpringBootApplication
public class TicketingServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(TicketingServiceApplication.class, args);
    }
}
