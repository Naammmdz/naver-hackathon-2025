package com.devflow.realtime.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "yjs")
public class RealtimeCollabProperties {

    private Duration snapshotInterval = Duration.ofMinutes(2);
    private int snapshotUpdateThreshold = 25;
    private int snapshotByteThreshold = 256 * 1024;
    private Persistence persistence = new Persistence();
    private Redis redis = new Redis();
    private Codec codec = new Codec();

    public Duration getSnapshotInterval() {
        return snapshotInterval;
    }

    public void setSnapshotInterval(Duration snapshotInterval) {
        this.snapshotInterval = snapshotInterval;
    }

    public int getSnapshotUpdateThreshold() {
        return snapshotUpdateThreshold;
    }

    public void setSnapshotUpdateThreshold(int snapshotUpdateThreshold) {
        this.snapshotUpdateThreshold = snapshotUpdateThreshold;
    }

    public int getSnapshotByteThreshold() {
        return snapshotByteThreshold;
    }

    public void setSnapshotByteThreshold(int snapshotByteThreshold) {
        this.snapshotByteThreshold = snapshotByteThreshold;
    }

    public Persistence getPersistence() {
        return persistence;
    }

    public void setPersistence(Persistence persistence) {
        this.persistence = persistence;
    }

    public Redis getRedis() {
        return redis;
    }

    public void setRedis(Redis redis) {
        this.redis = redis;
    }

    public Codec getCodec() {
        return codec;
    }

    public void setCodec(Codec codec) {
        this.codec = codec;
    }

    public static final class Persistence {
        private String mode = "hybrid";
        private boolean enabled = true;

        public String getMode() {
            return mode;
        }

        public void setMode(String mode) {
            this.mode = mode;
        }

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }

    public static final class Redis {
        private boolean enabled = true;
        private Duration ttl = Duration.ofMinutes(10);
        private String channelPrefix = "yjs.workspace";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public Duration getTtl() {
            return ttl;
        }

        public void setTtl(Duration ttl) {
            this.ttl = ttl;
        }

        public String getChannelPrefix() {
            return channelPrefix;
        }

        public void setChannelPrefix(String channelPrefix) {
            this.channelPrefix = channelPrefix;
        }
    }

    public static final class Codec {
        private boolean enabled = false;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
}
