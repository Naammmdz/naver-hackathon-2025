package com.naammm.becore.security;

public final class UserContext {

    private static final ThreadLocal<String> CURRENT_USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_USER_EMAIL = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_USERNAME = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_FIRST_NAME = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_LAST_NAME = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_ROLE = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_WORKSPACE_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_PLAN = new ThreadLocal<>();

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

    public static void setEmail(String email) {
        CURRENT_USER_EMAIL.set(email);
    }

    public static String getEmail() {
        return CURRENT_USER_EMAIL.get();
    }

    public static String requireEmail() {
        String email = CURRENT_USER_EMAIL.get();
        if (email == null || email.isBlank()) {
            throw new IllegalStateException("User email is not available in context");
        }
        return email;
    }

    public static void setUsername(String username) {
        CURRENT_USERNAME.set(username);
    }

    public static String getUsername() {
        return CURRENT_USERNAME.get();
    }

    public static void setFirstName(String firstName) {
        CURRENT_FIRST_NAME.set(firstName);
    }

    public static String getFirstName() {
        return CURRENT_FIRST_NAME.get();
    }

    public static void setLastName(String lastName) {
        CURRENT_LAST_NAME.set(lastName);
    }

    public static String getLastName() {
        return CURRENT_LAST_NAME.get();
    }

    public static void setRole(String role) {
        CURRENT_ROLE.set(role);
    }

    public static String getRole() {
        return CURRENT_ROLE.get();
    }

    public static void setWorkspaceId(String workspaceId) {
        CURRENT_WORKSPACE_ID.set(workspaceId);
    }

    public static String getWorkspaceId() {
        return CURRENT_WORKSPACE_ID.get();
    }

    public static void setPlan(String plan) {
        CURRENT_PLAN.set(plan);
    }

    public static String getPlan() {
        return CURRENT_PLAN.get();
    }

    public static void clear() {
        CURRENT_USER_ID.remove();
        CURRENT_USER_EMAIL.remove();
        CURRENT_USERNAME.remove();
        CURRENT_FIRST_NAME.remove();
        CURRENT_LAST_NAME.remove();
        CURRENT_ROLE.remove();
        CURRENT_WORKSPACE_ID.remove();
        CURRENT_PLAN.remove();
    }
}
