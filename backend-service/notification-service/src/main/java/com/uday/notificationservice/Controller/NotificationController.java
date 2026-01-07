package com.uday.notificationservice.Controller;

import com.google.firebase.messaging.FirebaseMessagingException;
import com.uday.notificationservice.service.FCMService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private FCMService fcmService;

    @PostMapping("/send")
    public String send(@RequestParam String token,
                       @RequestParam String title,
                       @RequestParam String body) throws FirebaseMessagingException {
        return fcmService.sendNotification(title, body, token);
    }
}
