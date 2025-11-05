package com.devflow.realtime.yjs;

import java.time.Instant;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class YjsDocument {

    private final Object delegate;
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
    private volatile Instant lastMutation = Instant.now();

    public YjsDocument(Object delegate) {
        this.delegate = delegate;
    }

    public Object getDelegate() {
        return delegate;
    }

    public Lock readLock() {
        return lock.readLock();
    }

    public Lock writeLock() {
        return lock.writeLock();
    }

    public Instant getLastMutation() {
        return lastMutation;
    }

    public void touch() {
        lastMutation = Instant.now();
    }
}
