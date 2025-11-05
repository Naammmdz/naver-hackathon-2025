package com.devflow.realtime.core;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class YjsPeriodicSnapshotService {

    private static final Logger log = LoggerFactory.getLogger(YjsPeriodicSnapshotService.class);

    private final YjsDocumentManager documentManager;

    public YjsPeriodicSnapshotService(YjsDocumentManager documentManager) {
        this.documentManager = documentManager;
    }

    @Scheduled(fixedDelayString = "${yjs.snapshot.interval:120000}")
    public void persistOpenWorkspaces() {
        try {
            documentManager.persistAll();
        } catch (Exception error) {
            log.error("Failed to execute periodic Yjs snapshot persistence", error);
        }
    }
}
