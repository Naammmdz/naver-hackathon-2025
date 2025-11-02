package com.naammm.becore.dto;

import com.naammm.becore.entity.WorkspaceRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteMemberRequest {
    private String email;
    private WorkspaceRole role;
}
