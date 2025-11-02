package com.naammm.becore.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.naammm.becore.dto.CreateWorkspaceRequest;
import com.naammm.becore.dto.InviteMemberRequest;
import com.naammm.becore.entity.Workspace;
import com.naammm.becore.entity.WorkspaceInvite;
import com.naammm.becore.security.UserContext;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import org.springframework.test.context.support.DirtiesContextBeforeModesTestExecutionListener;
import org.springframework.test.context.support.DirtiesContextTestExecutionListener;
import org.springframework.test.context.web.ServletTestExecutionListener;

@SpringBootTest
@TestExecutionListeners(
    listeners = {
        ServletTestExecutionListener.class,
        DirtiesContextBeforeModesTestExecutionListener.class,
        DependencyInjectionTestExecutionListener.class,
        DirtiesContextTestExecutionListener.class
    },
    mergeMode = TestExecutionListeners.MergeMode.REPLACE_DEFAULTS
)
class WorkspaceServiceIntegrationTest {

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private ObjectMapper objectMapper;

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    void invitedUserCanSeeWorkspaceAfterAccepting() throws JsonProcessingException {
        // Owner creates workspace
        UserContext.setUserId("owner_1");
        Workspace workspace = workspaceService.createWorkspace(
            CreateWorkspaceRequest.builder()
                .name("Test Workspace")
                .description("Integration test workspace")
                .build()
        );

        // Owner invites another user
        WorkspaceInvite invite = workspaceService.inviteMember(
            workspace.getId(),
            InviteMemberRequest.builder()
                .email("user2@example.com")
                .build()
        );

        // Invited user accepts invite
        UserContext.setUserId("user_2");
        workspaceService.acceptInvite(invite.getId());

        // Invited user fetches workspaces
        List<Workspace> workspaces = workspaceService.getAllWorkspaces();
        assertThat(workspaces)
            .extracting(Workspace::getId)
            .contains(workspace.getId());

        // Ensure workspace payload serializes successfully
        String json = objectMapper.writeValueAsString(workspaces);
        assertThat(json).contains(workspace.getId());
    }
}
