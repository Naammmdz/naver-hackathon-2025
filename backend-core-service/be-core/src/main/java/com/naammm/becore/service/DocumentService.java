package com.naammm.becore.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.Document;
import com.naammm.becore.entity.WorkspaceMember;
import com.naammm.becore.entity.WorkspaceRole;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.DocumentRepository;
import com.naammm.becore.repository.WorkspaceMemberRepository;
import com.naammm.becore.repository.WorkspaceRepository;
import com.naammm.becore.security.UserContext;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final RealtimeEventService realtimeEventService;

    public List<Document> getAllDocuments() {
        String userId = UserContext.requireUserId();
        return documentRepository.findByUserIdAndTrashedFalseOrderByUpdatedAtDesc(userId);
    }

    public Optional<Document> getDocumentById(String id) {
        String userId = UserContext.requireUserId();
        return documentRepository.findById(id)
                .filter(document -> canAccessDocument(document, userId));
    }

    public List<Document> getDocumentsByParentId(String parentId) {
        String userId = UserContext.requireUserId();
        return documentRepository.findByUserIdAndParentIdAndTrashedFalseOrderByUpdatedAtDesc(userId, parentId);
    }

    public List<Document> getTrashedDocuments() {
        String userId = UserContext.requireUserId();
        return documentRepository.findByUserIdAndTrashedTrueOrderByUpdatedAtDesc(userId);
    }

    public Document createDocument(Document document) {
        String userId = UserContext.requireUserId();
        document.setUserId(userId);
        if (StringUtils.hasText(document.getWorkspaceId())) {
            ensureCanModifyWorkspace(document.getWorkspaceId(), userId);
        }
        
        Document savedDocument = documentRepository.save(document);
        
        // Broadcast realtime event if document belongs to workspace
        if (StringUtils.hasText(savedDocument.getWorkspaceId())) {
            realtimeEventService.broadcastDocumentChange(
                savedDocument.getWorkspaceId(),
                "created",
                savedDocument.getId(),
                userId
            );
        }
        
        return savedDocument;
    }

    public Document updateDocument(String id, Document updatedDocument) {
        String userId = UserContext.requireUserId();
        Document document = getDocumentForCurrentUser(id, userId);

        if (StringUtils.hasText(document.getWorkspaceId())) {
            ensureCanModifyWorkspace(document.getWorkspaceId(), userId);
        }

        if (updatedDocument.getTitle() != null) {
            document.setTitle(updatedDocument.getTitle());
        }
        if (updatedDocument.getContent() != null) {
            document.setContent(updatedDocument.getContent());
        }
        if (updatedDocument.getIcon() != null) {
            document.setIcon(updatedDocument.getIcon());
        }
        document.setParentId(updatedDocument.getParentId());
        
        Document savedDocument = documentRepository.save(document);
        
        // Broadcast realtime event
        if (StringUtils.hasText(savedDocument.getWorkspaceId())) {
            realtimeEventService.broadcastDocumentChange(
                savedDocument.getWorkspaceId(),
                "updated",
                savedDocument.getId(),
                userId
            );
        }
        
        return savedDocument;
    }

    public void deleteDocument(String id) {
        String userId = UserContext.requireUserId();
        Document document = getDocumentForCurrentUser(id, userId);
        if (StringUtils.hasText(document.getWorkspaceId())) {
            ensureCanModifyWorkspace(document.getWorkspaceId(), userId);
        }
        
        String workspaceId = document.getWorkspaceId();
        
        // Mark as trashed instead of deleting
        document.setTrashed(true);
        document.setTrashedAt(LocalDateTime.now());
        documentRepository.save(document);
        
        // Broadcast realtime event
        if (StringUtils.hasText(workspaceId)) {
            realtimeEventService.broadcastDocumentChange(
                workspaceId,
                "deleted",
                id,
                userId
            );
        }
    }

    public void permanentlyDeleteDocument(String id) {
        String userId = UserContext.requireUserId();
        Document document = getDocumentForCurrentUser(id, userId);
        if (StringUtils.hasText(document.getWorkspaceId())) {
            ensureCanModifyWorkspace(document.getWorkspaceId(), userId);
        }
        documentRepository.delete(document);
    }

    public void restoreDocument(String id) {
        String userId = UserContext.requireUserId();
        Document document = getDocumentForCurrentUser(id, userId);
        if (StringUtils.hasText(document.getWorkspaceId())) {
            ensureCanModifyWorkspace(document.getWorkspaceId(), userId);
        }
        document.setTrashed(false);
        document.setTrashedAt(null);
        documentRepository.save(document);
    }

    public List<Document> searchDocuments(String search) {
        String userId = UserContext.requireUserId();
        if (!StringUtils.hasText(search)) {
            return documentRepository.findByUserIdAndTrashedFalseOrderByUpdatedAtDesc(userId);
        }
        return documentRepository.searchDocuments(userId, search.trim());
    }

    // Workspace-based methods with smart auto-detect
    public List<Document> getDocumentsByWorkspace(String workspaceId) {
        String userId = UserContext.requireUserId();
        
        // Validate workspace exists and user has access
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found: " + workspaceId));
        
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new SecurityException("Access denied to workspace: " + workspaceId);
        }
        
        // Smart detection: Single member (personal workspace) vs multi-member (shared workspace)
        long memberCount = workspaceMemberRepository.countByWorkspaceId(workspaceId);
        log.info("[DocumentService] Workspace {} has {} members, userId={}", workspaceId, memberCount, userId);
        
        if (memberCount <= 1) {
            // Personal workspace mode - show only user's documents
            log.info("[DocumentService] Using PERSONAL mode for workspace {}", workspaceId);
            return documentRepository.findByUserIdAndTrashedFalseOrderByUpdatedAtDesc(userId);
        } else {
            // Shared workspace mode - show all workspace documents
            log.info("[DocumentService] Using SHARED mode for workspace {}", workspaceId);
            return documentRepository.findByWorkspaceIdAndTrashedFalseOrderByUpdatedAtDesc(workspaceId);
        }
    }

    public List<Document> getDocumentsByWorkspaceAndParent(String workspaceId, String parentId) {
        String userId = UserContext.requireUserId();
        
        // Validate workspace exists and user has access
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found: " + workspaceId));
        
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new SecurityException("Access denied to workspace: " + workspaceId);
        }
        
        // Smart detection: Single member vs multi-member
        long memberCount = workspaceMemberRepository.countByWorkspaceId(workspaceId);
        log.info("[DocumentService] Workspace {} has {} members, parentId={}, userId={}", 
                 workspaceId, memberCount, parentId, userId);
        
        if (memberCount <= 1) {
            // Personal workspace mode
            log.info("[DocumentService] Using PERSONAL mode for workspace {} parent {}", workspaceId, parentId);
            return documentRepository.findByUserIdAndParentIdAndTrashedFalseOrderByUpdatedAtDesc(userId, parentId);
        } else {
            // Shared workspace mode
            log.info("[DocumentService] Using SHARED mode for workspace {} parent {}", workspaceId, parentId);
            return documentRepository.findByWorkspaceIdAndParentIdAndTrashedFalseOrderByUpdatedAtDesc(workspaceId, parentId);
        }
    }

    public List<Document> searchDocumentsByWorkspace(String workspaceId, String search) {
        String userId = UserContext.requireUserId();
        
        // Validate workspace exists and user has access
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found: " + workspaceId));
        
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new SecurityException("Access denied to workspace: " + workspaceId);
        }
        
        // Smart detection: Single member vs multi-member
        long memberCount = workspaceMemberRepository.countByWorkspaceId(workspaceId);
        log.info("[DocumentService] Searching workspace {} with {} members, search={}, userId={}", 
                 workspaceId, memberCount, search, userId);
        
        if (memberCount <= 1) {
            // Personal workspace mode - search user's documents
            log.info("[DocumentService] Using PERSONAL mode for workspace {} search", workspaceId);
            if (!StringUtils.hasText(search)) {
                return documentRepository.findByUserIdAndTrashedFalseOrderByUpdatedAtDesc(userId);
            }
            return documentRepository.searchDocuments(userId, search.trim());
        } else {
            // Shared workspace mode - search workspace documents
            log.info("[DocumentService] Using SHARED mode for workspace {} search", workspaceId);
            if (!StringUtils.hasText(search)) {
                return documentRepository.findByWorkspaceIdAndTrashedFalseOrderByUpdatedAtDesc(workspaceId);
            }
            return documentRepository.searchDocumentsByWorkspace(workspaceId, search.trim());
        }
    }

    private Document getDocumentForCurrentUser(String id, String userId) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        if (canAccessDocument(document, userId)) {
            return document;
        }

        throw new SecurityException("Access denied to document");
    }

    private boolean canAccessDocument(Document document, String userId) {
        if (userId.equals(document.getUserId())) {
            return true;
        }

        if (StringUtils.hasText(document.getWorkspaceId())) {
            return workspaceMemberRepository.existsByWorkspaceIdAndUserId(document.getWorkspaceId(), userId);
        }

        return false;
    }

    private WorkspaceRole requireWorkspaceRole(String workspaceId, String userId) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found: " + workspaceId));

        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new SecurityException("Access denied to workspace: " + workspaceId));
        return member.getRole();
    }

    private void ensureCanModifyWorkspace(String workspaceId, String userId) {
        WorkspaceRole role = requireWorkspaceRole(workspaceId, userId);
        if (role == WorkspaceRole.VIEWER) {
            throw new SecurityException("Viewer role cannot modify workspace documents");
        }
    }
}
