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
import com.naammm.becore.repository.WorkspaceInviteRepository;
import com.naammm.becore.repository.WorkspaceMemberRepository;
import com.naammm.becore.repository.WorkspaceRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceInviteRepository inviteRepository;

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
        
        return workspaceRepository.save(workspace);
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

    private boolean hasAccess(String workspaceId, String userId) {
        return workspaceRepository.userHasAccess(workspaceId, userId);
    }
}
