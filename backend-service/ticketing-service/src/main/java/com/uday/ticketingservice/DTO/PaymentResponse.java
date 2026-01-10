package com.uday.ticketingservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {
    private String status;
    private String paymentId;
    private String reason;
    private String orderId;
    private Integer amount;
    private String currency;
    private String error;
}
