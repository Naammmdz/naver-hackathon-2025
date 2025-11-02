package com.naammm.becore.dto;

import com.naammm.becore.entity.WorkspaceInvite;
import com.naammm.becore.entity.WorkspaceRole;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InviteNotificationDTO {
    private String type = "invite";
    private String inviteId;
    private String workspaceId;
    private String email;
    private WorkspaceRole role;
    private String invitedBy;
    
    public InviteNotificationDTO(WorkspaceInvite invite) {
        this.inviteId = invite.getId();
        this.workspaceId = invite.getWorkspaceId();
        this.email = invite.getEmail();
        this.role = invite.getRole();
        this.invitedBy = invite.getInvitedBy();
    }
}
