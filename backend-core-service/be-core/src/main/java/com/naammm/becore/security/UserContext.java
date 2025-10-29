package com.naammm.becore.security;

public final class UserContext {

    private static final ThreadLocal<String> CURRENT_USER_ID = new ThreadLocal<>();

    private UserContext() {
    }

    public static void setUserId(String userId) {
        CURRENT_USER_ID.set(userId);
    }

    public static String getUserId() {
        return CURRENT_USER_ID.get();
    }

    public static String requireUserId() {
        String userId = CURRENT_USER_ID.get();
        if (userId == null || userId.isBlank()) {
            throw new IllegalStateException("User context is not available");
        }
        return userId;
    }

    public static void clear() {
        CURRENT_USER_ID.remove();
    }
}
