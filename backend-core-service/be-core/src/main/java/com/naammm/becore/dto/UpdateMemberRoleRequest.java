package com.naammm.becore.dto;

import com.devflow.common.domain.entity.WorkspaceRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMemberRoleRequest {
    private WorkspaceRole role;
}
