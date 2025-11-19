package com.naammm.becore.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.naammm.becore.dto.CommentPermissions;
import com.naammm.becore.dto.CreateDocumentCommentRequest;
import com.naammm.becore.dto.DocumentCommentResponse;
import com.naammm.becore.dto.DocumentCommentsEnvelope;
import com.naammm.becore.dto.UpdateDocumentCommentRequest;
import com.naammm.becore.entity.Document;
import com.naammm.becore.entity.DocumentComment;
import com.naammm.becore.entity.WorkspaceRole;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.DocumentCommentRepository;
import com.naammm.becore.repository.DocumentRepository;
import com.naammm.becore.repository.WorkspaceMemberRepository;
import com.naammm.becore.repository.WorkspaceRepository;
import com.naammm.becore.security.UserContext;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class DocumentCommentService {


    private final DocumentRepository documentRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final DocumentCommentRepository commentRepository;
    private final ObjectMapper objectMapper;

    public DocumentCommentsEnvelope getComments(String documentId) {
        String userId = UserContext.requireUserId();
        Document document = requireDocument(documentId);
        AccessContext access = ensureCanView(document, userId);

        List<DocumentCommentResponse> responses = commentRepository.findByDocumentIdOrderByCreatedAtAsc(documentId)
                .stream()
                .map(comment -> mapToResponse(comment, access, userId, document.getUserId()))
                .toList();

        return DocumentCommentsEnvelope.builder()
                .comments(responses)
                .canComment(access.canComment())
                .canView(true)
                .build();
    }

    public DocumentCommentResponse createComment(String documentId, CreateDocumentCommentRequest request) {
        String userId = UserContext.requireUserId();
        Document document = requireDocument(documentId);
        AccessContext access = ensureCanView(document, userId);

        if (!access.canComment()) {
            throw new SecurityException("You don't have permission to comment on this document");
        }

        String parentId = null;
        if (StringUtils.hasText(request.getParentId())) {
            DocumentComment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent comment not found"));
            if (!parent.getDocumentId().equals(documentId)) {
                throw new IllegalArgumentException("Parent comment belongs to another document");
            }
            parentId = parent.getId();
        }

        DocumentComment comment = DocumentComment.builder()
                .documentId(documentId)
                .workspaceId(document.getWorkspaceId())
                .authorId(userId)
                .parentId(parentId)
                .content(request.getContent())
                .resolved(false)
                .build();

        DocumentComment saved = commentRepository.save(comment);
        return mapToResponse(saved, access, userId, document.getUserId());
    }

    public DocumentCommentResponse updateComment(String commentId, UpdateDocumentCommentRequest request) {
        String userId = UserContext.requireUserId();
        DocumentComment existing = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        Document document = requireDocument(existing.getDocumentId());
        AccessContext access = ensureCanView(document, userId);

        boolean wantsResolveChange = request.getResolved() != null;
        boolean wantsContentChange = StringUtils.hasText(request.getContent());

        if (wantsContentChange && !canEditComment(existing, access, userId, document.getUserId())) {
            throw new SecurityException("You cannot edit this comment");
        }

        if (wantsResolveChange && !access.canResolve()) {
            throw new SecurityException("You cannot change the resolve state");
        }

        if (wantsContentChange) {
            existing.setContent(request.getContent());
        }

        if (wantsResolveChange) {
            boolean resolved = Boolean.TRUE.equals(request.getResolved());
            existing.setResolved(resolved);
            if (resolved) {
                existing.setResolvedAt(LocalDateTime.now());
                existing.setResolvedBy(userId);
            } else {
                existing.setResolvedAt(null);
                existing.setResolvedBy(null);
            }
        }

        DocumentComment saved = commentRepository.save(existing);
        return mapToResponse(saved, access, userId, document.getUserId());
    }

    public void deleteComment(String commentId) {
        String userId = UserContext.requireUserId();
        DocumentComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));
        Document document = requireDocument(comment.getDocumentId());
        AccessContext access = ensureCanView(document, userId);

        if (!canDeleteComment(comment, access, userId, document.getUserId())) {
            throw new SecurityException("You cannot delete this comment");
        }

        commentRepository.delete(comment);
    }

    private Document requireDocument(String documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
    }

    private AccessContext ensureCanView(Document document, String userId) {
        boolean isOwner = document.getUserId().equals(userId);
        String workspaceId = document.getWorkspaceId();

        if (!StringUtils.hasText(workspaceId)) {
            if (!isOwner) {
                throw new SecurityException("Access denied");
            }
            return new AccessContext(null, WorkspaceRole.OWNER, true);
        }

        boolean hasAccess = workspaceRepository.userHasAccess(workspaceId, userId);
        if (!hasAccess) {
            throw new SecurityException("Access denied");
        }

        WorkspaceRole role = workspaceMemberRepository.findRoleByWorkspaceIdAndUserId(workspaceId, userId)
                .orElse(isOwner ? WorkspaceRole.OWNER : WorkspaceRole.VIEWER);
        return new AccessContext(workspaceId, role, isOwner);
    }


    private DocumentCommentResponse mapToResponse(
            DocumentComment comment,
            AccessContext access,
            String currentUserId,
            String documentOwnerId
    ) {
        CommentPermissions permissions = CommentPermissions.builder()
                .canEdit(canEditComment(comment, access, currentUserId, documentOwnerId))
                .canDelete(canDeleteComment(comment, access, currentUserId, documentOwnerId))
                .canResolve(access.canResolve())
                .build();

        return DocumentCommentResponse.builder()
                .id(comment.getId())
                .documentId(comment.getDocumentId())
                .workspaceId(comment.getWorkspaceId())
                .parentId(comment.getParentId())
                .content(comment.getContent())
                .resolved(Boolean.TRUE.equals(comment.getResolved()))
                .resolvedBy(comment.getResolvedBy())
                .resolvedAt(comment.getResolvedAt())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .authorId(comment.getAuthorId())
                .permissions(permissions)
                .reference(comment.getReference())
                .build();
    }

    private boolean canEditComment(
            DocumentComment comment,
            AccessContext access,
            String currentUserId,
            String documentOwnerId
    ) {
        return comment.getAuthorId().equals(currentUserId)
                || documentOwnerId.equals(currentUserId)
                || access.isPrivileged();
    }

    private boolean canDeleteComment(
            DocumentComment comment,
            AccessContext access,
            String currentUserId,
            String documentOwnerId
    ) {
        return canEditComment(comment, access, currentUserId, documentOwnerId);
    }

    private record AccessContext(String workspaceId, WorkspaceRole role, boolean isDocumentOwner) {
        boolean canComment() {
            if (isDocumentOwner) {
                return true;
            }
            if (role == null) {
                return false;
            }
            return switch (role) {
                case OWNER, ADMIN, MEMBER -> true;
                case VIEWER -> false;
            };
        }

        boolean isPrivileged() {
            if (isDocumentOwner) {
                return true;
            }
            if (role == null) {
                return false;
            }
            return switch (role) {
                case OWNER, ADMIN -> true;
                case MEMBER, VIEWER -> false;
            };
        }

        boolean canResolve() {
            return canComment();
        }
    }
}

