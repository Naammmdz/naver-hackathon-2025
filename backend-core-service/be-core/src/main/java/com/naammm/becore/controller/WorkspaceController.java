package com.naammm.becore.controller;

import java.util.List;

import com.naammm.becore.dto.CreateWorkspaceRequest;
import com.naammm.becore.dto.InviteMemberRequest;
import com.naammm.becore.dto.UpdateMemberRoleRequest;
import com.naammm.becore.dto.UpdateWorkspaceRequest;
import com.naammm.becore.entity.Workspace;
import com.naammm.becore.entity.WorkspaceInvite;
import com.naammm.becore.entity.WorkspaceMember;
import com.naammm.becore.security.UserContext;
import com.naammm.becore.service.WorkspaceService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
@Tag(name = "Workspace", description = "Workspace management endpoints")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @GetMapping
    @Operation(summary = "Get all workspaces for current user")
    public ResponseEntity<List<Workspace>> getAllWorkspaces() {
        String userId = UserContext.requireUserId();
        List<Workspace> workspaces = workspaceService.getAllWorkspaces(userId);
        return ResponseEntity.ok(workspaces);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get workspace by ID")
    public ResponseEntity<Workspace> getWorkspace(@PathVariable String id) {
        String userId = UserContext.requireUserId();
        Workspace workspace = workspaceService.getWorkspace(id, userId);
        return ResponseEntity.ok(workspace);
    }

    @PostMapping
    @Operation(summary = "Create new workspace")
    public ResponseEntity<Workspace> createWorkspace(@RequestBody CreateWorkspaceRequest request) {
        String userId = UserContext.requireUserId();
        Workspace workspace = workspaceService.createWorkspace(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(workspace);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update workspace")
    public ResponseEntity<Workspace> updateWorkspace(
            @PathVariable String id,
            @RequestBody UpdateWorkspaceRequest request) {
        String userId = UserContext.requireUserId();
        Workspace workspace = workspaceService.updateWorkspace(id, request, userId);
        return ResponseEntity.ok(workspace);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete workspace")
    public ResponseEntity<Void> deleteWorkspace(@PathVariable String id) {
        String userId = UserContext.requireUserId();
        workspaceService.deleteWorkspace(id, userId);
        return ResponseEntity.noContent().build();
    }

    // Member management

    @GetMapping("/{id}/members")
    @Operation(summary = "Get workspace members")
    public ResponseEntity<List<WorkspaceMember>> getMembers(@PathVariable String id) {
        String userId = UserContext.requireUserId();
        List<WorkspaceMember> members = workspaceService.getMembers(id, userId);
        return ResponseEntity.ok(members);
    }

    @GetMapping("/{id}/invites")
    @Operation(summary = "Get pending invites for workspace")
    public ResponseEntity<List<WorkspaceInvite>> getInvites(@PathVariable String id) {
        String userId = UserContext.requireUserId();
        List<WorkspaceInvite> invites = workspaceService.getInvites(id, userId);
        return ResponseEntity.ok(invites);
    }

    @PostMapping("/{id}/invites")
    @Operation(summary = "Invite member to workspace")
    public ResponseEntity<WorkspaceInvite> inviteMember(
            @PathVariable String id,
            @RequestBody InviteMemberRequest request) {
        String userId = UserContext.requireUserId();
        WorkspaceInvite invite = workspaceService.inviteMember(id, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(invite);
    }

    @PostMapping("/{id}/join")
    @Operation(summary = "Join public workspace")
    public ResponseEntity<WorkspaceMember> joinWorkspace(@PathVariable String id) {
        String userId = UserContext.requireUserId();
        WorkspaceMember member = workspaceService.joinPublicWorkspace(id, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(member);
    }

    @DeleteMapping("/{workspaceId}/members/{memberId}")
    @Operation(summary = "Remove member from workspace")
    public ResponseEntity<Void> removeMember(
            @PathVariable String workspaceId,
            @PathVariable String memberId) {
        String userId = UserContext.requireUserId();
        workspaceService.removeMember(workspaceId, memberId, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{workspaceId}/members/{memberId}")
    @Operation(summary = "Update member role")
    public ResponseEntity<WorkspaceMember> updateMemberRole(
            @PathVariable String workspaceId,
            @PathVariable String memberId,
            @RequestBody UpdateMemberRoleRequest request) {
        String userId = UserContext.requireUserId();
        WorkspaceMember member = workspaceService.updateMemberRole(workspaceId, memberId, request, userId);
        return ResponseEntity.ok(member);
    }

    @PostMapping("/{id}/leave")
    @Operation(summary = "Leave workspace")
    public ResponseEntity<Void> leaveWorkspace(@PathVariable String id) {
        String userId = UserContext.requireUserId();
        workspaceService.leaveWorkspace(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/invites/me")
    @Operation(summary = "Get my pending invites")
    public ResponseEntity<List<WorkspaceInvite>> getMyInvites() {
        String email = UserContext.getEmail();
        if (email == null) {
            return ResponseEntity.badRequest().build();
        }
        List<WorkspaceInvite> invites = workspaceService.getMyInvites(email);
        return ResponseEntity.ok(invites);
    }

    @PostMapping("/invites/{inviteId}/accept")
    @Operation(summary = "Accept workspace invite")
    public ResponseEntity<WorkspaceMember> acceptInvite(@PathVariable String inviteId) {
        String userId = UserContext.requireUserId();
        String email = UserContext.getEmail();
        if (email == null) {
            return ResponseEntity.badRequest().build();
        }
        WorkspaceMember member = workspaceService.acceptInvite(inviteId, userId, email);
        return ResponseEntity.ok(member);
    }

    @PostMapping("/invites/{inviteId}/decline")
    @Operation(summary = "Decline workspace invite")
    public ResponseEntity<Void> declineInvite(@PathVariable String inviteId) {
        String email = UserContext.getEmail();
        if (email == null) {
            return ResponseEntity.badRequest().build();
        }
        workspaceService.declineInvite(inviteId, email);
        return ResponseEntity.noContent().build();
    }
}
