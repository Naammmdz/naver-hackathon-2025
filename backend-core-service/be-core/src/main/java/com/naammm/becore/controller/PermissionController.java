package com.naammm.becore.controller;

import com.naammm.becore.dto.CheckPermissionRequest;
import com.naammm.becore.dto.PermissionResponse;
import com.naammm.becore.security.UserContext;
import com.naammm.becore.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @PostMapping("/check-permission")
    public ResponseEntity<PermissionResponse> checkPermission(@RequestBody CheckPermissionRequest request) {
        String userId = UserContext.getUserId();
        
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.ok(new PermissionResponse(false, true, null));
        }

        PermissionResponse response = permissionService.checkPermission(userId, request.getDocumentName());
        return ResponseEntity.ok(response);
    }
}

