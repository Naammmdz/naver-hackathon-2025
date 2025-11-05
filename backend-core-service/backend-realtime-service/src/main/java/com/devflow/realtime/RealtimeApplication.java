package com.devflow.realtime;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.devflow.realtime", "com.devflow.common"})
@EnableJpaRepositories(basePackages = {
    "com.devflow.common.domain.repository",
    "com.devflow.realtime.persistence"
})
@EntityScan(basePackages = {
    "com.devflow.common.domain.entity",
    "com.devflow.realtime.persistence"
})
@EnableScheduling
public class RealtimeApplication {

    public static void main(String[] args) {
        SpringApplication.run(RealtimeApplication.class, args);
    }
}
