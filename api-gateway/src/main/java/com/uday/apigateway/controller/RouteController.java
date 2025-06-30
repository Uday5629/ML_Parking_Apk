package com.uday.apigateway.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.Enumeration;

@RestController
@RequestMapping("/api")
public class RouteController {

    @Autowired
    private RestTemplate restTemplate;

    private final String PARKING_SERVICE = "http://PARKING-LOT-SERVICE";
    private final String TICKETING_SERVICE = "http://TICKETING-SERVICE";

    @RequestMapping(value = "/parking/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
    public ResponseEntity<?> forwardToParking(HttpServletRequest request, @RequestBody(required = false) String body) {
        return forward(request, body, PARKING_SERVICE);
    }

    @RequestMapping(value = "/tickets/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
    public ResponseEntity<?> forwardToTickets(HttpServletRequest request, @RequestBody(required = false) String body) {
        return forward(request, body, TICKETING_SERVICE);
    }

    private ResponseEntity<?> forward(HttpServletRequest request, String body, String serviceUrl) {
        try {
            String path = request.getRequestURI().replace("/api", "");
            String queryString = request.getQueryString();
            String fullUrl = serviceUrl + path + (queryString != null ? "?" + queryString : "");

            HttpHeaders headers = new HttpHeaders();
            Enumeration<String> headerNames = request.getHeaderNames();
            while (headerNames.hasMoreElements()) {
                String headerName = headerNames.nextElement();
                headers.put(headerName, Collections.list(request.getHeaders(headerName)));
            }

            HttpMethod method = HttpMethod.valueOf(request.getMethod());
            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            return restTemplate.exchange(fullUrl, method, entity, String.class);
        } catch (Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error forwarding request: " + e.getMessage());
    }

}
}
