//
//import com.razorpay.RazorpayClient;
//import com.razorpay.RazorpayException;
//import jakarta.annotation.PostConstruct;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//
//@Configuration
//public class RazorpayConfig {
//
//    @Value("${razorpay.key}")
//    private String key;
//
//    @Value("${razorpay.secret}")
//    private String secret;
//
//    @Bean
//    public RazorpayClient razorpayClient(@Value("${razorpay.key}") String key,
//                                         @Value("${razorpay.secret}") String secret) throws RazorpayException {
//        return new RazorpayClient(key, secret);
//    }
//
//}

package com.uday.paymentservice.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RazorpayConfig {

    @Bean
    public RazorpayClient razorpayClient() throws RazorpayException {
//        Dotenv dotenv = Dotenv.configure()
//                .directory("./payment-service")  // absolute path here
//                .filename(".env")  // name of the file
//                .load();
//        String key = dotenv.get("RAZORPAY_KEY");
//        String secret = dotenv.get("RAZORPAY_SECRET");
//
//        if (key == null) {
//            throw new RazorpayException("Missing Razorpay credentials in .env");
//        }
        String key="Demo purpose";
        String secret="secret - demo ";
        return new RazorpayClient(key, secret);
    }
}
