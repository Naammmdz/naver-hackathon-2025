package com.naammm.becore.search;

import lombok.Getter;

import java.util.Locale;

@Getter
public enum SearchType {
    TASK("task"),
    DOCUMENT("doc"),
    BOARD("board"),
    ALL("all");

    private final String value;

    SearchType(String value) {
        this.value = value;
    }

    public static SearchType from(String raw) {
        if (raw == null) {
            return ALL;
        }
        String normalized = raw.toLowerCase(Locale.ROOT);
        for (SearchType type : values()) {
            if (type.value.equals(normalized) || type.name().equalsIgnoreCase(normalized)) {
                return type;
            }
        }
        return ALL;
    }
}

