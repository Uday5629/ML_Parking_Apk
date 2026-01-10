package com.uday.parkinglotservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateLevelException extends RuntimeException {
    public DuplicateLevelException(String message) {
        super(message);
    }
}
