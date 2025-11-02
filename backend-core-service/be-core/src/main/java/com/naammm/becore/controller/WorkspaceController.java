package com.naammm.becore.controller;

import java.util.List;

import com.naammm.becore.dto.CreateWorkspaceRequest;
import com.naammm.becore.dto.InviteMemberRequest;
import com.naammm.becore.dto.UpdateMemberRoleRequest;
import com.naammm.becore.dto.UpdateWorkspaceRequest;
import com.naammm.becore.entity.Workspace;
import com.naammm.becore.entity.WorkspaceInvite;
import com.naammm.becore.entity.WorkspaceMember;
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
        List<Workspace> workspaces = workspaceService.getAllWorkspaces();
        return ResponseEntity.ok(workspaces);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get workspace by ID")
    public ResponseEntity<Workspace> getWorkspace(@PathVariable String id) {
        Workspace workspace = workspaceService.getWorkspace(id);
        return ResponseEntity.ok(workspace);
    }

    @PostMapping
    @Operation(summary = "Create new workspace")
    public ResponseEntity<Workspace> createWorkspace(@RequestBody CreateWorkspaceRequest request) {
        Workspace workspace = workspaceService.createWorkspace(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(workspace);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update workspace")
    public ResponseEntity<Workspace> updateWorkspace(
            @PathVariable String id,
            @RequestBody UpdateWorkspaceRequest request) {
        Workspace workspace = workspaceService.updateWorkspace(id, request);
        return ResponseEntity.ok(workspace);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete workspace")
    public ResponseEntity<Void> deleteWorkspace(@PathVariable String id) {
        workspaceService.deleteWorkspace(id);
        return ResponseEntity.noContent().build();
    }

    // Member management

    @GetMapping("/{id}/members")
    @Operation(summary = "Get workspace members")
    public ResponseEntity<List<WorkspaceMember>> getMembers(@PathVariable String id) {
        List<WorkspaceMember> members = workspaceService.getMembers(id);
        return ResponseEntity.ok(members);
    }

    @PostMapping("/{id}/invites")
    @Operation(summary = "Invite member to workspace")
    public ResponseEntity<WorkspaceInvite> inviteMember(
            @PathVariable String id,
            @RequestBody InviteMemberRequest request) {
        WorkspaceInvite invite = workspaceService.inviteMember(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(invite);
    }

    @DeleteMapping("/{workspaceId}/members/{memberId}")
    @Operation(summary = "Remove member from workspace")
    public ResponseEntity<Void> removeMember(
            @PathVariable String workspaceId,
            @PathVariable String memberId) {
        workspaceService.removeMember(workspaceId, memberId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{workspaceId}/members/{memberId}")
    @Operation(summary = "Update member role")
    public ResponseEntity<WorkspaceMember> updateMemberRole(
            @PathVariable String workspaceId,
            @PathVariable String memberId,
            @RequestBody UpdateMemberRoleRequest request) {
        WorkspaceMember member = workspaceService.updateMemberRole(workspaceId, memberId, request);
        return ResponseEntity.ok(member);
    }

    @PostMapping("/{id}/leave")
    @Operation(summary = "Leave workspace")
    public ResponseEntity<Void> leaveWorkspace(@PathVariable String id) {
        workspaceService.leaveWorkspace(id);
        return ResponseEntity.noContent().build();
    }

    // Invite management

    @GetMapping("/invites")
    @Operation(summary = "Get my pending invites")
    public ResponseEntity<List<WorkspaceInvite>> getMyInvites() {
        List<WorkspaceInvite> invites = workspaceService.getMyInvites();
        return ResponseEntity.ok(invites);
    }

    @PostMapping("/invites/{inviteId}/accept")
    @Operation(summary = "Accept workspace invite")
    public ResponseEntity<WorkspaceMember> acceptInvite(@PathVariable String inviteId) {
        WorkspaceMember member = workspaceService.acceptInvite(inviteId);
        return ResponseEntity.ok(member);
    }

    @PostMapping("/invites/{inviteId}/reject")
    @Operation(summary = "Reject workspace invite")
    public ResponseEntity<Void> rejectInvite(@PathVariable String inviteId) {
        workspaceService.rejectInvite(inviteId);
        return ResponseEntity.noContent().build();
    }
}
