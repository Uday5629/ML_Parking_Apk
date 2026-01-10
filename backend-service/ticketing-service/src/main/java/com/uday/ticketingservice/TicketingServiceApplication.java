package com.uday.ticketingservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.reactive.function.client.WebClient;

@EnableDiscoveryClient
@EnableScheduling
@SpringBootApplication
public class TicketingServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(TicketingServiceApplication.class, args);
    }

    @Configuration
    public class WebClientConfig {

        @Bean
        @LoadBalanced
        public WebClient loadBalancedWebClient(WebClient.Builder builder) {
            return builder.build();
        }
    }
}
