package com.naammm.becore.service;

import com.naammm.becore.dto.PermissionResponse;
import com.naammm.becore.entity.Workspace;
import com.naammm.becore.repository.DocumentRepository;
import com.naammm.becore.repository.WorkspaceMemberRepository;
import com.naammm.becore.repository.WorkspaceRepository;
import com.naammm.becore.security.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PermissionService {

    private final DocumentRepository documentRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;

    /**
     * Check if user has permission to access a document.
     * Supports:
     * - "document-{id}" - individual document
     * - "workspace-{id}" - workspace-level document (for tasks, boards sync)
     */
    public PermissionResponse checkPermission(String userId, String documentName) {
        if (documentName == null) {
            return new PermissionResponse(false, true, null);
        }

        // Handle workspace-level documents
        if (documentName.startsWith("workspace-")) {
            // Extract workspace ID
            String workspaceId = documentName.substring("workspace-".length());
            
            // Check if workspace exists
            Workspace workspace = workspaceRepository.findById(workspaceId).orElse(null);
            if (workspace == null) {
                return new PermissionResponse(false, true, null);
            }
            
            // Check if user is a member (has access)
            boolean isMember = workspaceRepository.userHasAccess(workspaceId, userId);
            
            // If user is a member, allow full access
            if (isMember) {
                return new PermissionResponse(true, false, userId);
            }
            
            // If workspace is public, allow read-only access
            if (Boolean.TRUE.equals(workspace.getIsPublic())) {
                return new PermissionResponse(true, true, userId); // Read-only for public workspace
            }
            
            // Workspace is private and user is not a member
            return new PermissionResponse(false, true, null);
        }

        // Handle individual documents
        if (documentName.startsWith("document-")) {
            // Extract document ID from documentName
            String documentId = documentName.substring("document-".length());
            
            // Check if document exists and user has access
            boolean hasAccess = documentRepository.findByIdAndUserId(documentId, userId).isPresent();
            
            if (hasAccess) {
                // For now, all users with access can edit (readOnly = false)
                // In future, you can add role-based checks here
                return new PermissionResponse(true, false, userId);
            }
        }

        return new PermissionResponse(false, true, null);
    }
}

