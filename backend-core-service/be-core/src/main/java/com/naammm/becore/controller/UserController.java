package com.naammm.becore.controller;

import com.naammm.becore.entity.User;
import com.naammm.becore.security.UserContext;
import com.naammm.becore.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Get current user info from JWT context and ensure user exists in database")
    public ResponseEntity<Map<String, Object>> me() {
        // Get or create user in database
        User user = userService.getOrCreateUser();
        
        Map<String, Object> body = new HashMap<>();
        body.put("id", user.getId());
        body.put("email", user.getEmail());
        body.put("username", user.getUsername());
        body.put("first_name", user.getFirstName());
        body.put("last_name", user.getLastName());
        body.put("role", UserContext.getRole());
        body.put("workspace_id", UserContext.getWorkspaceId());
        body.put("plan", UserContext.getPlan());
        body.put("created_at", user.getCreatedAt());
        body.put("updated_at", user.getUpdatedAt());
        return ResponseEntity.ok(body);
    }
}
