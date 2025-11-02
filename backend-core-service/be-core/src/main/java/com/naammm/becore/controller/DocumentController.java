package com.naammm.becore.controller;

import java.util.List;

import com.naammm.becore.entity.Document;
import com.naammm.becore.service.DocumentService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping
    public ResponseEntity<List<Document>> getAllDocuments(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(documentService.getAllDocuments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Document> getDocumentById(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId) {
        return documentService.getDocumentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/parent/{parentId}")
    public ResponseEntity<List<Document>> getDocumentsByParentId(
            @PathVariable String parentId,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(documentService.getDocumentsByParentId(parentId));
    }

    @GetMapping("/trashed")
    public ResponseEntity<List<Document>> getTrashedDocuments(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(documentService.getTrashedDocuments());
    }

    @PostMapping
    public ResponseEntity<Document> createDocument(
            @RequestBody Document document,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(documentService.createDocument(document));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Document> updateDocument(
            @PathVariable String id,
            @RequestBody Document document,
            @RequestHeader("X-User-Id") String userId) {
        try {
            return ResponseEntity.ok(documentService.updateDocument(id, document));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId) {
        documentService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentlyDeleteDocument(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId) {
        documentService.permanentlyDeleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/restore")
    public ResponseEntity<Void> restoreDocument(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId) {
        documentService.restoreDocument(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<Document>> searchDocuments(
            @RequestParam String q,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(documentService.searchDocuments(q));
    }

    // Workspace-based endpoints
    @GetMapping("/workspace/{workspaceId}")
    public ResponseEntity<List<Document>> getDocumentsByWorkspace(
            @PathVariable String workspaceId,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(documentService.getDocumentsByWorkspace(workspaceId));
    }

    @GetMapping("/workspace/{workspaceId}/parent/{parentId}")
    public ResponseEntity<List<Document>> getDocumentsByWorkspaceAndParent(
            @PathVariable String workspaceId,
            @PathVariable String parentId,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(documentService.getDocumentsByWorkspaceAndParent(workspaceId, parentId));
    }

    @GetMapping("/workspace/{workspaceId}/search")
    public ResponseEntity<List<Document>> searchDocumentsByWorkspace(
            @PathVariable String workspaceId,
            @RequestParam String q,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(documentService.searchDocumentsByWorkspace(workspaceId, q));
    }
}