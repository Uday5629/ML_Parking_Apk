package com.uday.paymentservice.controller;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.uday.paymentservice.dto.PaymentRequest;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    @Autowired(required = false)
    private RazorpayClient razorpayClient;

    @Value("${payment.mode:MOCK}")
    private String paymentMode;

    @Value("${payment.mock.fail.amount:500}")
    private int mockFailAmount;

    @PostMapping("/create")
    public ResponseEntity<?> createPayment(@RequestBody PaymentRequest request) {
        System.out.println("Payment controller");
        // ---- MOCK MODE ----
        if ("MOCK".equalsIgnoreCase(paymentMode)) {
            return handleMockPayment(request);
        }

        // ---- REAL MODE (Razorpay) ----
        return handleRealPayment(request);
    }

    // ================= MOCK PAYMENT =================
    private ResponseEntity<?> handleMockPayment(PaymentRequest request) {

        System.out.println("Mock payment invoked for ticketId="
                + request.getTicketId()
                + ", amount=" + request.getAmount());

        if (request.getAmount() > mockFailAmount) {
            return ResponseEntity.ok(Map.of(
                    "status", "FAILED",
                    "reason", "Mock failure: amount exceeds limit"
            ));
        }

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "paymentId", "MOCK_PAY_" + request.getTicketId()
        ));
    }

    // ================= REAL PAYMENT =================
    private ResponseEntity<?> handleRealPayment(PaymentRequest request) {
        if (razorpayClient == null) {
            throw new IllegalStateException(
                    "Payment mode is REAL but RazorpayClient is not configured"
            );
        }

        try {
            int amount = request.getAmount() * 100; // ₹ → paise

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amount);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "receipt#" + request.getTicketId());

            Order order = razorpayClient.orders.create(orderRequest);

            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "orderId", order.get("id"),
                    "amount", amount,
                    "currency", "INR"
            ));

        } catch (RazorpayException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "status", "FAILED",
                    "error", e.getMessage()
            ));
        }
    }
}

