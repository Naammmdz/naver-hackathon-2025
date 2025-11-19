package com.naammm.becore.controller;

import com.naammm.becore.dto.search.SearchResponseDto;
import com.naammm.becore.search.SearchType;
import com.naammm.becore.security.UserContext;
import com.naammm.becore.service.GlobalSearchService;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
@Validated
@RequiredArgsConstructor
public class SearchController {

    private final GlobalSearchService globalSearchService;

    @GetMapping
    public SearchResponseDto search(
            @RequestParam("q") @NotBlank String query,
            @RequestParam(value = "type", required = false, defaultValue = "all") String typeParam,
            @RequestParam(value = "workspaceId", required = false) String workspaceId,
            @RequestParam(value = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(value = "size", defaultValue = "10") @Min(1) int size
    ) {
        String trimmedQuery = query.trim();
        if (trimmedQuery.length() < 2) {
            return SearchResponseDto.builder()
                    .results(java.util.Collections.emptyList())
                    .total(0)
                    .tookMs(0)
                    .build();
        }
        int safeSize = Math.min(size, 50);
        Pageable pageable = PageRequest.of(page, safeSize);
        String userId = UserContext.requireUserId();
        SearchType type = SearchType.from(typeParam);
        return globalSearchService.search(trimmedQuery, type, workspaceId, userId, pageable);
    }
}

