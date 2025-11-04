package com.naammm.becore;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BeCoreApplication {

    public static void main(String[] args) {
        SpringApplication.run(BeCoreApplication.class, args);
    }

}
