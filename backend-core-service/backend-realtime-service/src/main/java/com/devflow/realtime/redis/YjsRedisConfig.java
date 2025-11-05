package com.devflow.realtime.redis;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
public class YjsRedisConfig {

    @Bean
    public RedisMessageListenerContainer yjsRedisListenerContainer(
        RedisConnectionFactory connectionFactory,
        YjsRedisService redisService
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(redisService, redisService.getChannel());
        return container;
    }
}
