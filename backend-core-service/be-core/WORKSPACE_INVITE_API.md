# Workspace Invite & Public Workspace APIs

## Overview

Backend đã được tích hợp đầy đủ tính năng invite users và public workspace.

## Workspace Settings

### Public/Private Workspace
- `isPublic`: Boolean - Cho phép bất kỳ ai join workspace
- `allowInvites`: Boolean - Cho phép invite users vào workspace

## APIs

### Workspace Management

#### 1. Update Workspace Settings
```
PATCH /api/workspaces/{id}
Body: {
  "isPublic": true/false,
  "allowInvites": true/false,
  "name": "...",
  "description": "..."
}
```

#### 2. Join Public Workspace
```
POST /api/workspaces/{id}/join
Response: WorkspaceMember
```
- Chỉ hoạt động nếu workspace là public (`isPublic = true`)
- Tự động tạo member với role `MEMBER`

### Invite Management

#### 1. Invite Member
```
POST /api/workspaces/{id}/invites
Body: {
  "email": "user@example.com",
  "role": "MEMBER" | "ADMIN"
}
Response: WorkspaceInvite
```
- Chỉ owner và admins có thể invite
- Workspace phải có `allowInvites = true` (trừ owner)
- Invite expires sau 7 days

#### 2. Get Workspace Invites
```
GET /api/workspaces/{id}/invites
Response: List<WorkspaceInvite>
```
- Chỉ owner và admins có thể xem

#### 3. Get My Invites
```
GET /api/invites
Response: List<WorkspaceInvite>
```
- Lấy tất cả invites cho current user

#### 4. Accept Invite
```
POST /api/invites/{inviteId}/accept
Response: WorkspaceMember
```
- Tạo member trong workspace
- Xóa invite sau khi accept
- Check invite expiration

#### 5. Decline Invite
```
POST /api/invites/{inviteId}/decline
```
- Xóa invite

### Member Management

#### 1. Get Members
```
GET /api/workspaces/{id}/members
Response: List<WorkspaceMember>
```

#### 2. Remove Member
```
DELETE /api/workspaces/{workspaceId}/members/{memberId}
```
- Owner có thể remove anyone
- Admins có thể remove members (không thể remove admins khác)

#### 3. Update Member Role
```
PATCH /api/workspaces/{workspaceId}/members/{memberId}
Body: {
  "role": "MEMBER" | "ADMIN"
}
```
- Chỉ owner có thể change roles

#### 4. Leave Workspace
```
POST /api/workspaces/{id}/leave
```
- Owner không thể leave (phải transfer ownership hoặc delete)

## Permission Flow

### Workspace-Level Documents (`workspace-{id}`)

1. **Member**: Full access (read + write)
2. **Public Workspace Non-Member**: Read-only access
3. **Private Workspace Non-Member**: No access

### Permission Check Logic

```java
if (isMember) {
    return full access;
}
if (isPublic) {
    return read-only access;
}
return no access;
```

## Security

### Invite Validation
- Check invite expiration
- Check invite email matches user
- Check if user is already a member

### Public Workspace
- Anyone authenticated can join
- Auto-assign `MEMBER` role
- Read-only access cho non-members

### Member Removal
- Owner: Can remove anyone
- Admin: Can remove members only
- Members: Cannot remove anyone

## Usage Examples

### 1. Make Workspace Public
```bash
PATCH /api/workspaces/{id}
{
  "isPublic": true
}
```

### 2. Invite User
```bash
POST /api/workspaces/{id}/invites
{
  "email": "john@example.com",
  "role": "MEMBER"
}
```

### 3. Join Public Workspace
```bash
POST /api/workspaces/{id}/join
```

### 4. Accept Invite
```bash
POST /api/invites/{inviteId}/accept
```

## Notes

- **Email Matching**: Hiện tại `getMyInvites` và `acceptInvite` sử dụng `userId` để match với email. Trong production, cần lấy email từ user service (Clerk) và match với invite email.
- **Invite Expiration**: Mặc định 7 days, có thể config trong entity.
- **Public Workspace**: Non-members có read-only access cho realtime sync (workspace-level documents).

