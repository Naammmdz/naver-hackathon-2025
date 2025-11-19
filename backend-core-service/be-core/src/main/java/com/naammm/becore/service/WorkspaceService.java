package com.naammm.becore.service;

import java.time.LocalDateTime;
import java.util.List;

import com.naammm.becore.dto.CreateWorkspaceRequest;
import com.naammm.becore.dto.InviteMemberRequest;
import com.naammm.becore.dto.UpdateMemberRoleRequest;
import com.naammm.becore.dto.UpdateWorkspaceRequest;
import com.naammm.becore.entity.Workspace;
import com.naammm.becore.entity.WorkspaceInvite;
import com.naammm.becore.entity.WorkspaceMember;
import com.naammm.becore.entity.WorkspaceRole;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.BoardRepository;
import com.naammm.becore.repository.DocumentRepository;
import com.naammm.becore.repository.TaskRepository;
import com.naammm.becore.repository.WorkspaceInviteRepository;
import com.naammm.becore.repository.WorkspaceMemberRepository;
import com.naammm.becore.repository.WorkspaceRepository;
import com.naammm.becore.security.UserContext;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceInviteRepository inviteRepository;
    private final TaskRepository taskRepository;
    private final DocumentRepository documentRepository;
    private final BoardRepository boardRepository;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<Workspace> getAllWorkspaces(String userId) {
        return workspaceRepository.findAllByUserId(userId);
    }

    @Transactional(readOnly = true)
    public Workspace getWorkspace(String id, String userId) {
        Workspace workspace = workspaceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
        
        if (!hasAccess(id, userId)) {
            throw new SecurityException("Access denied");
        }
        
        return workspace;
    }

    @Transactional
    public Workspace createWorkspace(CreateWorkspaceRequest request, String userId) {
        Workspace workspace = Workspace.builder()
            .name(request.getName())
            .description(request.getDescription())
            .ownerId(userId)
            .isPublic(request.getIsPublic() != null ? request.getIsPublic() : false)
            .allowInvites(request.getAllowInvites() != null ? request.getAllowInvites() : true)
            .defaultTaskView(request.getDefaultTaskView() != null ? request.getDefaultTaskView() : "list")
            .defaultDocumentView(request.getDefaultDocumentView() != null ? request.getDefaultDocumentView() : "list")
            .build();
        
        workspace = workspaceRepository.save(workspace);
        
        // Add owner as a member with ADMIN role
        WorkspaceMember ownerMember = WorkspaceMember.builder()
            .workspace(workspace)
            .userId(userId)
            .fullName(resolveCurrentUserFullName())
            .role(WorkspaceRole.ADMIN)
            .joinedAt(LocalDateTime.now())
            .build();
        memberRepository.save(ownerMember);
        
        // Flush to ensure member is saved immediately
        entityManager.flush();
        // Don't refresh workspace to avoid ConcurrentModificationException during serialization
        // The member is already saved and will be available for access checks
        
        return workspace;
    }

    @Transactional
    public Workspace updateWorkspace(String id, UpdateWorkspaceRequest request, String userId) {
        Workspace workspace = getWorkspace(id, userId);
        
        // Only owner can update workspace settings
        if (!workspace.getOwnerId().equals(userId)) {
            throw new SecurityException("Only workspace owner can update settings");
        }
        
        if (request.getName() != null) {
            workspace.setName(request.getName());
        }
        if (request.getDescription() != null) {
            workspace.setDescription(request.getDescription());
        }
        if (request.getIsPublic() != null) {
            workspace.setIsPublic(request.getIsPublic());
        }
        if (request.getAllowInvites() != null) {
            workspace.setAllowInvites(request.getAllowInvites());
        }
        if (request.getDefaultTaskView() != null) {
            workspace.setDefaultTaskView(request.getDefaultTaskView());
        }
        if (request.getDefaultDocumentView() != null) {
            workspace.setDefaultDocumentView(request.getDefaultDocumentView());
        }
        
        return workspaceRepository.save(workspace);
    }

    @Transactional
    public void deleteWorkspace(String id, String userId) {
        Workspace workspace = getWorkspace(id, userId);
        
        // Only owner can delete workspace
        if (!workspace.getOwnerId().equals(userId)) {
            throw new SecurityException("Only workspace owner can delete workspace");
        }
        
        // Delete all related resources
        taskRepository.deleteByWorkspaceId(id);
        documentRepository.deleteByWorkspaceId(id);
        boardRepository.deleteByWorkspaceId(id);
        inviteRepository.deleteByWorkspaceId(id);
        
        workspaceRepository.delete(workspace);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceMember> getMembers(String workspaceId, String userId) {
        if (!hasAccess(workspaceId, userId)) {
            throw new SecurityException("Access denied");
        }
        
        return memberRepository.findByWorkspaceId(workspaceId);
    }

    @Transactional
    public WorkspaceInvite inviteMember(String workspaceId, InviteMemberRequest request, String userId) {
        Workspace workspace = getWorkspace(workspaceId, userId);
        
        // Check if invites are allowed
        if (!workspace.getAllowInvites() && !workspace.getOwnerId().equals(userId)) {
            throw new SecurityException("Invites are not allowed in this workspace");
        }
        
        // Check if already invited
        if (inviteRepository.findByWorkspaceIdAndEmail(workspaceId, request.getEmail()).isPresent()) {
            throw new IllegalStateException("User already invited");
        }
        
        WorkspaceInvite invite = WorkspaceInvite.builder()
            .workspaceId(workspaceId)
            .email(request.getEmail())
            .role(request.getRole() != null ? request.getRole() : WorkspaceRole.MEMBER)
            .invitedBy(userId)
            .expiresAt(LocalDateTime.now().plusDays(7))
            .build();
        
        return inviteRepository.save(invite);
    }

    @Transactional
    public void removeMember(String workspaceId, String memberId, String userId) {
        Workspace workspace = getWorkspace(workspaceId, userId);
        
        WorkspaceMember member = memberRepository.findById(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        
        // Owner can remove anyone, admins can remove members
        boolean isOwner = workspace.getOwnerId().equals(userId);
        WorkspaceRole userRole = memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
            .map(WorkspaceMember::getRole)
            .orElse(null);
        
        if (!isOwner && (userRole != WorkspaceRole.ADMIN || member.getRole() == WorkspaceRole.ADMIN)) {
            throw new SecurityException("Insufficient permissions");
        }
        
        memberRepository.delete(member);
    }

    @Transactional
    public WorkspaceMember updateMemberRole(String workspaceId, String memberId, 
                                           UpdateMemberRoleRequest request, String userId) {
        Workspace workspace = getWorkspace(workspaceId, userId);
        
        // Only owner can change roles
        if (!workspace.getOwnerId().equals(userId)) {
            throw new SecurityException("Only workspace owner can change member roles");
        }
        
        WorkspaceMember member = memberRepository.findById(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        
        member.setRole(request.getRole());
        return memberRepository.save(member);
    }

    @Transactional
    public void leaveWorkspace(String workspaceId, String userId) {
        Workspace workspace = getWorkspace(workspaceId, userId);
        
        // Owner cannot leave (must transfer ownership or delete workspace)
        if (workspace.getOwnerId().equals(userId)) {
            throw new IllegalStateException("Owner cannot leave workspace. Transfer ownership or delete workspace.");
        }
        
        memberRepository.deleteByWorkspaceIdAndUserId(workspaceId, userId);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceInvite> getInvites(String workspaceId, String userId) {
        Workspace workspace = getWorkspace(workspaceId, userId);
        
        // Only owner and admins can see invites
        boolean isOwner = workspace.getOwnerId().equals(userId);
        WorkspaceRole userRole = memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
            .map(WorkspaceMember::getRole)
            .orElse(null);
        
        if (!isOwner && userRole != WorkspaceRole.ADMIN) {
            throw new SecurityException("Only owner and admins can view invites");
        }
        
        return inviteRepository.findByWorkspaceId(workspaceId);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceInvite> getMyInvites(String email) {
        // Fetch invites by email
        return inviteRepository.findByEmail(email);
    }

    @Transactional
    public WorkspaceMember acceptInvite(String inviteId, String userId, String email) {
        WorkspaceInvite invite = inviteRepository.findById(inviteId)
            .orElseThrow(() -> new ResourceNotFoundException("Invite not found"));
        
        // Check if invite is for this user (by email)
        // In production, verify email matches user's email
        if (!invite.getEmail().equals(email)) {
            throw new SecurityException("This invite is not for you");
        }
        
        // Check if invite is expired
        if (invite.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Invite has expired");
        }
        
        // Check if already a member
        if (memberRepository.existsByWorkspaceIdAndUserId(invite.getWorkspaceId(), userId)) {
            // Delete invite and return existing member
            inviteRepository.delete(invite);
            return memberRepository.findByWorkspaceIdAndUserId(invite.getWorkspaceId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        }
        
        // Create member
        Workspace workspace = workspaceRepository.findById(invite.getWorkspaceId())
            .orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
        
        WorkspaceMember member = WorkspaceMember.builder()
            .workspace(workspace)
            .userId(userId)
            .fullName(resolveCurrentUserFullName())
            .role(invite.getRole())
            .build();
        
        member = memberRepository.save(member);
        
        // Delete invite
        inviteRepository.delete(invite);
        
        return member;
    }

    @Transactional
    public void declineInvite(String inviteId, String email) {
        WorkspaceInvite invite = inviteRepository.findById(inviteId)
            .orElseThrow(() -> new ResourceNotFoundException("Invite not found"));
        
        // Check if invite is for this user
        if (!invite.getEmail().equals(email)) {
            throw new SecurityException("This invite is not for you");
        }
        
        inviteRepository.delete(invite);
    }

    @Transactional
    public WorkspaceMember joinPublicWorkspace(String workspaceId, String userId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
        
        // Check if workspace is public
        if (!Boolean.TRUE.equals(workspace.getIsPublic())) {
            throw new SecurityException("Workspace is not public");
        }
        
        // Check if already a member
        if (memberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            return memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        }
        
        // Create member with default role
        WorkspaceMember member = WorkspaceMember.builder()
            .workspace(workspace)
            .userId(userId)
            .fullName(resolveCurrentUserFullName())
            .role(WorkspaceRole.MEMBER)
            .build();
        
        return memberRepository.save(member);
    }

    private boolean hasAccess(String workspaceId, String userId) {
        return workspaceRepository.userHasAccess(workspaceId, userId);
    }

    private String resolveCurrentUserFullName() {
        String firstName = StringUtils.hasText(UserContext.getFirstName()) ? UserContext.getFirstName() : null;
        String lastName = StringUtils.hasText(UserContext.getLastName()) ? UserContext.getLastName() : null;
        String username = StringUtils.hasText(UserContext.getUsername()) ? UserContext.getUsername() : null;
        String email = StringUtils.hasText(UserContext.getEmail()) ? UserContext.getEmail() : null;
        String userId = UserContext.requireUserId();

        if (firstName != null || lastName != null) {
            if (firstName != null && lastName != null) {
                return firstName + " " + lastName;
            }
            return firstName != null ? firstName : lastName;
        }

        if (username != null) {
            return username;
        }

        if (email != null) {
            return email;
        }

        return userId;
    }
}
