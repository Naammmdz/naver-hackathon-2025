package com.naammm.becore.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPresence {
    private String id;
    private String email;
    private String name;
    private String avatarUrl;
    private CursorPosition cursor;
    private Selection selection;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CursorPosition {
        private Double x;
        private Double y;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Selection {
        private Integer start;
        private Integer end;
    }
}
