# ===========================
# 1. Build stage
# ===========================
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy pom.xml and download dependencies first (to cache better)
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# ===========================
# 2. Run stage
# ===========================
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app

# Copy only the built jar from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose service port (replace with actual service.port from application.properties)
EXPOSE 8761

# Run the jar
ENTRYPOINT ["java","-jar","app.jar"]
