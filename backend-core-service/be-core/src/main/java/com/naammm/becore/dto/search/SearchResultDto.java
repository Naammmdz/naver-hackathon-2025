package com.naammm.becore.dto.search;

import com.naammm.becore.search.SearchType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.util.Map;

@Value
@Builder
public class SearchResultDto {
    String id;
    SearchType type;
    String title;
    String snippet;
    String workspaceId;
    String userId;
    LocalDate updatedAt;
    Map<String, Object> metadata;
}

