package com.naammm.becore.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum WorkspaceRole {
    OWNER,
    ADMIN,
    MEMBER,
    VIEWER;

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static WorkspaceRole fromValue(String value) {
        if (value == null) {
            return null;
        }
        return WorkspaceRole.valueOf(value.toUpperCase());
    }
}
