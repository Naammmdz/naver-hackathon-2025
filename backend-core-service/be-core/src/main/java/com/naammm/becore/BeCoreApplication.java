package com.naammm.becore;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.naammm.becore", "com.devflow.common"})
@EntityScan(basePackages = {"com.naammm.becore.entity", "com.devflow.common.domain.entity"})
@EnableJpaRepositories(basePackages = {"com.naammm.becore.repository", "com.devflow.common.domain.repository"})
public class BeCoreApplication {

    public static void main(String[] args) {
        SpringApplication.run(BeCoreApplication.class, args);
    }

}
