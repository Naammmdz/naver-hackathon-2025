package com.naammm.becore.dto;

import java.util.List;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class DocumentCommentsEnvelope {
    List<DocumentCommentResponse> comments;
    boolean canComment;
    boolean canView;
}

