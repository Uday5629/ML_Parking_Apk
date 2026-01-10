package com.uday.notificationservice.service;

import com.google.firebase.messaging.*;
import org.springframework.stereotype.Service;

@Service
public class FCMService {

    public String sendNotification(String title, String body, String token) throws FirebaseMessagingException {
        Notification notification = Notification.builder()
                .setTitle(title)
                .setBody(body)
                .build();

        Message message = Message.builder()
                .setToken(token)  // FCM token of the device
                .setNotification(notification)
                .build();

        return FirebaseMessaging.getInstance().send(message);
    }
}
