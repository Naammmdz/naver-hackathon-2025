package com.naammm.becore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentPermissions {
    private boolean canEdit;
    private boolean canDelete;
    private boolean canResolve;
}

