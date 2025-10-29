package com.naammm.becore.config;

import com.naammm.becore.security.ClerkAuthFilter;
import com.naammm.becore.security.ClerkProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@Configuration
@EnableConfigurationProperties(ClerkProperties.class)
public class SecurityConfig {

    @Bean
    public FilterRegistrationBean<ClerkAuthFilter> clerkAuthFilterRegistration(ClerkAuthFilter filter) {
        FilterRegistrationBean<ClerkAuthFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(filter);
        registrationBean.addUrlPatterns("/api/*");
        registrationBean.setOrder(0);
        return registrationBean;
    }
}
