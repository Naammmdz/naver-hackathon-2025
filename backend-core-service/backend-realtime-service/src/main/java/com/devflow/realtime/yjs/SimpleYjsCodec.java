package com.devflow.realtime.yjs;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "yjs.codec.enabled", havingValue = "false", matchIfMissing = true)
public class SimpleYjsCodec implements YjsCodec {

    @Override
    public YjsDocument newDocument() {
        return new YjsDocument(new State());
    }

    @Override
    public YjsDocument hydrate(byte[] snapshot, byte[] vector) {
        State state = new State();
        state.snapshot = snapshot != null ? snapshot.clone() : new byte[0];
        state.vector = vector != null ? vector.clone() : digest(state.snapshot);
        return new YjsDocument(state);
    }

    @Override
    public void applyUpdate(YjsDocument document, byte[] update) {
        State state = (State) document.getDelegate();
        byte[] payload = update != null ? update.clone() : new byte[0];
        state.snapshot = payload;
        state.vector = digest(payload);
    }

    @Override
    public byte[] encodeStateVector(YjsDocument document) {
        State state = (State) document.getDelegate();
        return state.vector.clone();
    }

    @Override
    public byte[] encodeStateAsUpdate(YjsDocument document, byte[] clientVector) {
        State state = (State) document.getDelegate();
        if (clientVector != null && Arrays.equals(clientVector, state.vector)) {
            return new byte[0];
        }
        return state.snapshot.clone();
    }

    @Override
    public byte[] encodeSnapshot(YjsDocument document) {
        State state = (State) document.getDelegate();
        return state.snapshot.clone();
    }

    private static byte[] digest(byte[] data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return md.digest(data);
        } catch (NoSuchAlgorithmException e) {
            return new byte[0];
        }
    }

    private static final class State {
        private byte[] snapshot = new byte[0];
        private byte[] vector = digest(new byte[0]);
    }
}
