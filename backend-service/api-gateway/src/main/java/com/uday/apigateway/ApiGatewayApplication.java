package com.uday.apigateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;


/**
 * The main application class for the Spring Cloud Gateway.
 * It uses the WebFlux dependency provided by the gateway starter (not Spring MVC).
 */
@EnableDiscoveryClient
@SpringBootApplication
public class ApiGatewayApplication {
    public static void main(String[] args) {

        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
