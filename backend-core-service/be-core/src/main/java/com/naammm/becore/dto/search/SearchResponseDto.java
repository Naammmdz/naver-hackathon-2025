package com.naammm.becore.dto.search;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class SearchResponseDto {
    List<SearchResultDto> results;
    long total;
    long tookMs;
}

