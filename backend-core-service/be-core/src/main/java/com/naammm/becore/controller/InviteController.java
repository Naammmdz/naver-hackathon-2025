package com.naammm.becore.controller;

import java.util.List;

import com.naammm.becore.entity.WorkspaceInvite;
import com.naammm.becore.entity.WorkspaceMember;
import com.naammm.becore.security.UserContext;
import com.naammm.becore.service.WorkspaceService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/invites")
@RequiredArgsConstructor
@Tag(name = "Invites", description = "Workspace invite management endpoints")
public class InviteController {

    private final WorkspaceService workspaceService;

    @GetMapping
    @Operation(summary = "Get all pending invites for current user")
    public ResponseEntity<List<WorkspaceInvite>> getMyInvites() {
        String email = UserContext.requireEmail();
        List<WorkspaceInvite> invites = workspaceService.getMyInvites(email);
        return ResponseEntity.ok(invites);
    }

    @PostMapping("/{inviteId}/accept")
    @Operation(summary = "Accept workspace invite")
    public ResponseEntity<WorkspaceMember> acceptInvite(@PathVariable String inviteId) {
        String email = UserContext.requireEmail();
        String userId = UserContext.requireUserId();
        WorkspaceMember member = workspaceService.acceptInvite(inviteId, userId, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(member);
    }

    @PostMapping("/{inviteId}/decline")
    @Operation(summary = "Decline workspace invite")
    public ResponseEntity<Void> declineInvite(@PathVariable String inviteId) {
        String email = UserContext.requireEmail();
        workspaceService.declineInvite(inviteId, email);
        return ResponseEntity.noContent().build();
    }
}

