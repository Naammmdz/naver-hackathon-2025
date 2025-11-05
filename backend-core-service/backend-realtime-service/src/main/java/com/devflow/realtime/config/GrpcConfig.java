package com.devflow.realtime.config;

import com.devflow.realtime.codec.YjsCodecClient;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "yjs.codec.enabled", havingValue = "true")
public class GrpcConfig {

    private final NodeCodecProperties nodeCodecProperties;

    public GrpcConfig(NodeCodecProperties nodeCodecProperties) {
        this.nodeCodecProperties = nodeCodecProperties;
    }

    @Bean(destroyMethod = "shutdownNow")
    public ManagedChannel codecManagedChannel() {
        return ManagedChannelBuilder
            .forAddress(nodeCodecProperties.getHost(), nodeCodecProperties.getPort())
            .usePlaintext()
            .build();
    }

    @Bean
    public YjsCodecClient yjsCodecClient(ManagedChannel codecManagedChannel) {
        return new YjsCodecClient(codecManagedChannel);
    }
}
