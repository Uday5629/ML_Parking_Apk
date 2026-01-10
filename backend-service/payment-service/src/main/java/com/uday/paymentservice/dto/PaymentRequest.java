package com.uday.paymentservice.dto;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class PaymentRequest {

    private Long ticketId;
    private String vehicleNumber;
    private int amount;

}
