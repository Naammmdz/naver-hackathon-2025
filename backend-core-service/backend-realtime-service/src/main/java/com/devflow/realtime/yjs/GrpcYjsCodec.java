package com.devflow.realtime.yjs;

import com.devflow.realtime.codec.YjsCodecClient;
import com.devflow.realtime.codec.YjsCodecClient.MergeResult;

import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "yjs.codec.enabled", havingValue = "true")
public class GrpcYjsCodec implements YjsCodec {

    private static final Logger log = LoggerFactory.getLogger(GrpcYjsCodec.class);
    private final YjsCodecClient codecClient;

    public GrpcYjsCodec(YjsCodecClient codecClient) {
        this.codecClient = codecClient;
    }

    @Override
    public YjsDocument newDocument() {
        return new YjsDocument(new State(new byte[0], codecClient.encodeStateVector(new byte[0])));
    }

    @Override
    public YjsDocument hydrate(byte[] snapshot, byte[] vector) {
        State initial = new State(snapshot, vector);
        if (initial.vector.length == 0) {
            initial.update(initial.snapshot, codecClient.encodeStateVector(initial.snapshot));
        }
        return new YjsDocument(initial);
    }

    @Override
    public void applyUpdate(YjsDocument document, byte[] update) {
        State state = state(document);
        MergeResult result = codecClient.merge(state.snapshot, update);
        state.update(result.snapshot(), result.vector());
    }

    @Override
    public byte[] encodeStateVector(YjsDocument document) {
        State state = state(document);
        if (state.vector.length == 0) {
            state.update(state.snapshot, codecClient.encodeStateVector(state.snapshot));
        }
        return state.vector.clone();
    }

    @Override
    public byte[] encodeStateAsUpdate(YjsDocument document, byte[] clientVector) {
        State state = state(document);
        return codecClient.encodeStateAsUpdate(state.snapshot, clientVector);
    }

    @Override
    public byte[] encodeSnapshot(YjsDocument document) {
        return state(document).snapshot.clone();
    }

    private static State state(YjsDocument document) {
        Object delegate = document.getDelegate();
        if (delegate instanceof State state) {
            return state;
        }
        throw new IllegalStateException("Unsupported YjsDocument delegate: " + delegate);
    }

    private static final class State {
        private byte[] snapshot;
        private byte[] vector;

        private State(byte[] snapshot, byte[] vector) {
            this.snapshot = snapshot != null ? snapshot.clone() : new byte[0];
            this.vector = vector != null ? vector.clone() : new byte[0];
        }

        private void update(byte[] snapshot, byte[] vector) {
            this.snapshot = snapshot != null ? snapshot.clone() : new byte[0];
            this.vector = vector != null ? vector.clone() : new byte[0];
        }
    }
}
