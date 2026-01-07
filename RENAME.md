# Parking Lot Microservices — Project Documentation

This document summarizes the project layout, how to run it locally (Docker), important behavior notes, and key files / symbols to inspect when developing.

## Table of contents

- Overview
- Architecture & components
- Quick start (Docker Compose)
- Building individual services
- Frontend dev notes
- Important files & symbols (links)
- Useful commands & troubleshooting

## Overview

A Spring Boot microservices system (Maven) with a React frontend. The API Gateway routes client requests under `/api/**` to backend microservices via service discovery.

Top-level compose orchestrates:

- PostgreSQL
- Eureka discovery + config
- API Gateway
- Microservices: parking-lot, ticketing, vehicle, payment, notification
- React frontend

See root compose: [docker-compose.yml](docker-compose.yml)

## Architecture & components

- API Gateway (Spring Cloud Gateway) — routes `/api/*` to backend services. See configuration: [backend-service/api-gateway/src/main/resources/application.properties](backend-service/api-gateway/src/main/resources/application.properties) and main class [`com.uday.apigateway.ApiGatewayApplication`](backend-service/api-gateway/src/main/java/com/uday/apigateway/ApiGatewayApplication.java).
- Parking Lot Service — allocation, spot management and orchestration with other services. See main app: [`com.uday.parkinglotservice.ParkingLotServiceApplication`](backend-service/parking-lot-service/src/main/java/com/uday/parkinglotservice/ParkingLotServiceApplication.java) and core service logic: [`com.uday.parkinglotservice.ParkingLotService`](backend-service/parking-lot-service/src/main/java/com/uday/parkinglotservice/ParkingLotService.java).
- Ticketing Service — ticket create/exit. See main app: [`com.uday.ticketingservice.TicketingServiceApplication`](backend-service/ticketing-service/src/main/java/com/uday/ticketingservice/TicketingServiceApplication.java) and controller: [`com.uday.ticketingservice.Controller.TicketController`](backend-service/ticketing-service/src/main/java/com/uday/ticketingservice/Controller/TicketController.java) plus service: [`com.uday.ticketingservice.ticketService`](backend-service/ticketing-service/src/main/java/com/uday/ticketingservice/ticketService.java).
- Vehicle Service — vehicle persistence. Main: [`com.uday.vehicleservice.VehicleServiceApplication`](backend-service/vehicle-service/src/main/java/com/uday/vehicleservice/VehicleServiceApplication.java) and controller: [`com.uday.vehicleservice.controller.VehicleController`](backend-service/vehicle-service/src/main/java/com/uday/vehicleservice/controller/VehicleController.java).
- Payment Service — mock/real payment handling. Main: [`com.uday.paymentservice.PaymentServiceApplication`](backend-service/payment-service/src/main/java/com/uday/paymentservice/PaymentServiceApplication.java) and controller: [`com.uday.paymentservice.controller.PaymentController`](backend-service/payment-service/src/main/java/com/uday/paymentservice/controller/PaymentController.java). Razorpay client config: [`com.uday.paymentservice.config.RazorpayConfig`](backend-service/payment-service/src/main/java/com/uday/paymentservice/config/RazorpayConfig.java).
- Notification Service — Firebase notifications. Main: [`com.uday.notificationservice.NotificationServiceApplication`](backend-service/notification-service/src/main/java/com/uday/notificationservice/NotificationServiceApplication.java) and FCM helper: [`com.uday.notificationservice.service.FCMService`](backend-service/notification-service/src/main/java/com/uday/notificationservice/service/FCMService.java).

## Quick start (recommended)

Prerequisites:

- Docker & Docker Compose
- (optional) Java 17 & Maven for local builds

From project root:

1. Start everything with Docker Compose (build images the first time):

```sh
docker compose up --build
```
