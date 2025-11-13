package com.naammm.becore.controller;

import com.naammm.becore.security.UserContext;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class UserController {

    @GetMapping("/me")
    @Operation(summary = "Get current user info from JWT context")
    public ResponseEntity<Map<String, Object>> me() {
        Map<String, Object> body = new HashMap<>();
        body.put("id", UserContext.getUserId());
        body.put("email", UserContext.getEmail());
        body.put("username", UserContext.getUsername());
        body.put("first_name", UserContext.getFirstName());
        body.put("last_name", UserContext.getLastName());
        body.put("role", UserContext.getRole());
        body.put("workspace_id", UserContext.getWorkspaceId());
        body.put("plan", UserContext.getPlan());
        return ResponseEntity.ok(body);
    }
}


