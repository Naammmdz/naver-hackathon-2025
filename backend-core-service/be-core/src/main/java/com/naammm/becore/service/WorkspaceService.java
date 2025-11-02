package com.naammm.becore.service;

import java.time.LocalDateTime;
import java.util.List;

import com.naammm.becore.dto.CreateWorkspaceRequest;
import com.naammm.becore.dto.InviteMemberRequest;
import com.naammm.becore.dto.InviteNotificationDTO;
import com.naammm.becore.dto.UpdateMemberRoleRequest;
import com.naammm.becore.dto.UpdateWorkspaceRequest;
import com.naammm.becore.entity.InviteStatus;
import com.naammm.becore.entity.Workspace;
import com.naammm.becore.entity.WorkspaceInvite;
import com.naammm.becore.entity.WorkspaceMember;
import com.naammm.becore.entity.WorkspaceRole;
import com.naammm.becore.exception.DuplicateInviteException;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.WorkspaceInviteRepository;
import com.naammm.becore.repository.WorkspaceMemberRepository;
import com.naammm.becore.repository.WorkspaceRepository;
import com.naammm.becore.security.UserContext;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceInviteRepository inviteRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<Workspace> getAllWorkspaces() {
        String userId = UserContext.requireUserId();
        log.info("[WorkspaceService] Getting all workspaces for userId: {}", userId);
        
        // Get workspace IDs directly (no lazy loading issues)
        List<String> workspaceIds = memberRepository.findWorkspaceIdsByUserId(userId);
        log.info("[WorkspaceService] Found {} workspace IDs for userId: {}", workspaceIds.size(), userId);
        
        if (workspaceIds.isEmpty()) {
            log.info("[WorkspaceService] No workspaces found for userId: {}", userId);
            return List.of();
        }
        
        // Fetch full workspace objects
        List<Workspace> workspaces = workspaceRepository.findAllById(workspaceIds);
        log.info("[WorkspaceService] Returning {} workspaces for userId: {}", workspaces.size(), userId);
        return workspaces;
    }

    @Transactional(readOnly = true)
    public Workspace getWorkspace(String id) {
        String userId = UserContext.requireUserId();
        Workspace workspace = workspaceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
        
        if (!hasAccess(id, userId)) {
            throw new SecurityException("Access denied");
        }
        
        return workspace;
    }

    @Transactional
    public Workspace createWorkspace(CreateWorkspaceRequest request) {
        String userId = UserContext.requireUserId();
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
        
        // Create workspace member for the owner
        WorkspaceMember ownerMember = WorkspaceMember.builder()
            .workspace(workspace)
            .userId(userId)
            .role(WorkspaceRole.OWNER)
            .build();
        memberRepository.save(ownerMember);
        
        log.info("[WorkspaceService] Created workspace {} with owner member for user {}", 
                 workspace.getId(), userId);
        
        return workspace;
    }

    @Transactional
    public Workspace updateWorkspace(String id, UpdateWorkspaceRequest request) {
        String userId = UserContext.requireUserId();
        Workspace workspace = getWorkspace(id);
        
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
    public void deleteWorkspace(String id) {
        String userId = UserContext.requireUserId();
        Workspace workspace = getWorkspace(id);
        
        // Only owner can delete workspace
        if (!workspace.getOwnerId().equals(userId)) {
            throw new SecurityException("Only workspace owner can delete workspace");
        }
        
        workspaceRepository.delete(workspace);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceMember> getMembers(String workspaceId) {
        String userId = UserContext.requireUserId();
        if (!hasAccess(workspaceId, userId)) {
            throw new SecurityException("Access denied");
        }
        
        return memberRepository.findByWorkspaceId(workspaceId);
    }

    @Transactional
    public WorkspaceInvite inviteMember(String workspaceId, InviteMemberRequest request) {
        String userId = UserContext.requireUserId();
        Workspace workspace = getWorkspace(workspaceId);
        
        // Check if invites are allowed
        if (!workspace.getAllowInvites() && !workspace.getOwnerId().equals(userId)) {
            throw new SecurityException("Invites are not allowed in this workspace");
        }
        
        LocalDateTime now = LocalDateTime.now();

        WorkspaceInvite invite = inviteRepository
            .findByWorkspaceIdAndEmail(workspaceId, request.getEmail())
            .map(existingInvite -> {
                boolean hasActivePendingInvite = existingInvite.getStatus() == InviteStatus.PENDING
                    && existingInvite.getExpiresAt() != null
                    && existingInvite.getExpiresAt().isAfter(now);

                if (hasActivePendingInvite) {
                    throw new DuplicateInviteException("User already has a pending invite");
                }

                existingInvite.setStatus(InviteStatus.PENDING);
                existingInvite.setRole(request.getRole() != null ? request.getRole() : WorkspaceRole.MEMBER);
                existingInvite.setInvitedBy(userId);
                existingInvite.setExpiresAt(now.plusDays(7));
                return existingInvite;
            })
            .orElseGet(() -> WorkspaceInvite.builder()
                .workspaceId(workspaceId)
                .email(request.getEmail())
                .role(request.getRole() != null ? request.getRole() : WorkspaceRole.MEMBER)
                .invitedBy(userId)
                .expiresAt(now.plusDays(7))
                .build());
        
        invite = inviteRepository.save(invite);
        log.info("Saved invite: id={}, workspaceId={}, email={}, role={}", 
            invite.getId(), invite.getWorkspaceId(), invite.getEmail(), invite.getRole());
        
        // Broadcast invite notification to the invited user's email
        String destination = "/topic/user." + request.getEmail();
        InviteNotificationDTO notification = new InviteNotificationDTO(invite);
        log.info("Broadcasting invite notification to destination: {}", destination);
        log.info("Notification payload: {}", notification);
        
        messagingTemplate.convertAndSend(destination, notification);
        log.info("Invite notification sent successfully");
        
        return invite;
    }

    @Transactional
    public void removeMember(String workspaceId, String memberId) {
        String userId = UserContext.requireUserId();
        Workspace workspace = getWorkspace(workspaceId);
        
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
                                           UpdateMemberRoleRequest request) {
        String userId = UserContext.requireUserId();
        Workspace workspace = getWorkspace(workspaceId);
        
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
    public void leaveWorkspace(String workspaceId) {
        String userId = UserContext.requireUserId();
        Workspace workspace = getWorkspace(workspaceId);
        
        // Owner cannot leave (must transfer ownership or delete workspace)
        if (workspace.getOwnerId().equals(userId)) {
            throw new IllegalStateException("Owner cannot leave workspace. Transfer ownership or delete workspace.");
        }
        
        memberRepository.deleteByWorkspaceIdAndUserId(workspaceId, userId);
    }

    // Invite management
    
    public List<WorkspaceInvite> getMyInvites() {
        // Ensure user is authenticated
        UserContext.requireUserId();
        
        // Get user email from Clerk - for now, search by email that matches any invite
        // In production, you'd call Clerk API to get user's email
        // For now, return all pending invites (admin will see all)
        log.info("Getting all pending invites (temporary - no user filtering)");
        return inviteRepository.findAll().stream()
            .filter(invite -> invite.getStatus() == InviteStatus.PENDING)
            .filter(invite -> invite.getExpiresAt().isAfter(LocalDateTime.now()))
            .toList();
    }

    @Transactional
    public WorkspaceMember acceptInvite(String inviteId) {
        String userId = UserContext.requireUserId();
        
        WorkspaceInvite invite = inviteRepository.findById(inviteId)
            .orElseThrow(() -> new ResourceNotFoundException("Invite not found"));
        
        // NOTE: In production, verify invite email matches user's Clerk email
        // For now, allow any user to accept any invite
        
        // Check if invite is still valid
        if (invite.getStatus() != InviteStatus.PENDING) {
            throw new IllegalStateException("Invite has already been " + invite.getStatus().toValue());
        }
        
        if (invite.getExpiresAt().isBefore(LocalDateTime.now())) {
            invite.setStatus(InviteStatus.EXPIRED);
            inviteRepository.save(invite);
            throw new IllegalStateException("Invite has expired");
        }
        
        // Check if user is already a member
        if (memberRepository.findByWorkspaceIdAndUserId(invite.getWorkspaceId(), userId).isPresent()) {
            throw new IllegalStateException("You are already a member of this workspace");
        }
        
        // Get workspace
        Workspace workspace = workspaceRepository.findById(invite.getWorkspaceId())
            .orElseThrow(() -> new ResourceNotFoundException("Workspace not found"));
        
        // Create workspace member
        WorkspaceMember member = WorkspaceMember.builder()
            .workspace(workspace)
            .userId(userId)
            .role(invite.getRole())
            .build();
        
        member = memberRepository.save(member);
        log.info("Created workspace member: id={}, workspaceId={}, userId={}, role={}", 
            member.getId(), workspace.getId(), userId, member.getRole());
        
        // Update invite status
        invite.setStatus(InviteStatus.ACCEPTED);
        inviteRepository.save(invite);
        log.info("Invite accepted successfully: inviteId={}, userId={}", inviteId, userId);
        
        return member;
    }

    @Transactional
    public void rejectInvite(String inviteId) {
        // Ensure user is authenticated
        UserContext.requireUserId();
        
        WorkspaceInvite invite = inviteRepository.findById(inviteId)
            .orElseThrow(() -> new ResourceNotFoundException("Invite not found"));
        
        // NOTE: In production, verify invite email matches user's Clerk email
        // For now, allow any authenticated user to reject any invite
        
        // Update invite status
        if (invite.getStatus() == InviteStatus.PENDING) {
            invite.setStatus(InviteStatus.REJECTED);
            inviteRepository.save(invite);
        }
    }

    private boolean hasAccess(String workspaceId, String userId) {
        return workspaceRepository.userHasAccess(workspaceId, userId);
    }
}
