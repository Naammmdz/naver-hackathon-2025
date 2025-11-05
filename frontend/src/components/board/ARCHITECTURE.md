# Online Users Feature - Architecture

## Component Hierarchy

```
BoardView
│
├── BoardSidebar
│   └── (Board list, filters, etc.)
│
├── Drag Handle
│
└── Canvas Area (flex-col)
    │
    ├── BoardHeader ⭐ NEW
    │   │
    │   ├── Board Title
    │   │   └── <h1>{boardTitle}</h1>
    │   │
    │   └── Search + Online Users Container
    │       │
    │       ├── Search Input
    │       │   └── <Input with icon>
    │       │
    │       └── OnlineUsers ⭐ NEW
    │           │
    │           ├── Avatar Stack
    │           │   ├── Avatar 1 (with tooltip)
    │           │   ├── Avatar 2 (with tooltip)
    │           │   ├── Avatar 3 (with tooltip)
    │           │   └── Overflow Button (+X)
    │           │       └── Popover (full user list)
    │           │
    │           └── Label ("X users online")
    │
    └── CanvasContainer
        └── Canvas (Excalidraw)
```

## Data Flow

```
WebSocket Connection
        │
        ↓
CollaborationContext
        │
        ├─→ Manages Connection
        ├─→ Tracks activeUsers []
        ├─→ Handles join/leave events
        └─→ Assigns user colors
        │
        ↓
useCollaboration() Hook
        │
        ↓
OnlineUsers Component
        │
        ├─→ Filters out current user
        ├─→ Slices visible/hidden users
        ├─→ Renders avatar stack
        └─→ Handles overflow popover
```

## State Management

### CollaborationContext State
```typescript
{
  activeUsers: CollaborationUser[],  // All active users
  isConnected: boolean,              // WebSocket status
  isReconnecting: boolean            // Reconnection status
}
```

### CollaborationUser Type
```typescript
{
  id: string,
  email: string,
  name?: string,
  avatarUrl?: string,
  cursor?: { x: number, y: number },
  selection?: { start: number, end: number },
  color: string  // Generated from user ID
}
```

### OnlineUsers Local State
```typescript
{
  showAllUsers: boolean  // Controls popover visibility
}
```

## Event Flow

### User Joins Workspace
```
1. User opens workspace
2. CollaborationContext.connect()
3. WebSocket connection established
4. Send join message to server
5. Server broadcasts to all clients
6. activeUsers array updated
7. OnlineUsers re-renders with new user
```

### User Leaves Workspace
```
1. User closes workspace/disconnects
2. Server detects disconnect
3. Server broadcasts user-left event
4. activeUsers array updated (user removed)
5. OnlineUsers re-renders without user
```

### User Color Assignment
```
1. User ID → Hash function
2. Hash % colorArray.length
3. Consistent color for same user
4. Used for avatar, border, indicator
```

## Responsive Behavior Flow

```
Screen Width Detection
        │
        ├─→ Desktop (>768px)
        │   ├── Show board title
        │   ├── Show search bar (flexible)
        │   ├── Show 2 avatars max
        │   └── Show "X users online" label
        │
        ├─→ Tablet (640-768px)
        │   ├── Show board title
        │   ├── Show search bar (flexible)
        │   ├── Show 2 avatars max
        │   └── Show "X users online" label
        │
        └─→ Mobile (<640px)
            ├── Hide board title
            ├── Show search bar (full width)
            ├── Show 2 avatars max
            └── Hide "X users online" label
```

## Component Communication

```
Parent Components
        │
        ↓
BoardView (knows active board)
        │
        ↓
BoardHeader (receives boardTitle)
        │
        ↓
OnlineUsers (reads from context)
        │
        ↓
CollaborationContext (global state)
```

## Overflow Handling Logic

```typescript
// OnlineUsers component logic
const otherUsers = activeUsers.filter(u => u.id !== userId);
const visibleUsers = otherUsers.slice(0, maxVisible);  // e.g., [0, 1, 2]
const hiddenUsers = otherUsers.slice(maxVisible);      // e.g., [3, 4, 5, ...]
const hasHiddenUsers = hiddenUsers.length > 0;

// Render logic
if (hasHiddenUsers) {
  // Show overflow indicator: "+X"
  // Where X = hiddenUsers.length
}
```

## CSS/Tailwind Structure

```
BoardHeader Container
├── h-14                    (Fixed height)
├── border-b                (Bottom border)
├── bg-card/50              (Semi-transparent bg)
├── backdrop-blur           (Blur effect)
├── flex items-center       (Horizontal layout)
├── justify-between         (Space between items)
└── gap-4                   (Spacing)

Avatar Stack Container
├── flex items-center       (Horizontal layout)
├── -space-x-2              (Overlap avatars)
└── [Avatar components]
    ├── border-2            (Avatar border)
    ├── border-background   (Match background)
    ├── transition-all      (Smooth animations)
    ├── hover:scale-110     (Grow on hover)
    └── hover:z-10          (Bring to front)
```

## Performance Optimizations

### 1. Memoization
```typescript
// Callbacks are memoized with useCallback
const getUserInitial = useCallback((user) => {...}, []);
```

### 2. Conditional Rendering
```typescript
// Don't render if no users
if (otherUsers.length === 0) return null;
```

### 3. Efficient Filtering
```typescript
// Filter current user once
const otherUsers = activeUsers.filter(u => u.id !== userId);
```

### 4. Controlled Re-renders
```typescript
// Only re-render when activeUsers changes
const { activeUsers } = useCollaboration();
```

## File Organization

```
frontend/src/components/board/
├── OnlineUsers.tsx              [165 lines] - Main component
├── BoardHeader.tsx              [47 lines]  - Header with integration
├── BoardView.tsx                [Modified]  - Added header
├── ONLINE_USERS_README.md       [190 lines] - Documentation
├── OnlineUsersExamples.tsx      [181 lines] - Usage examples
└── ARCHITECTURE.md              [This file]  - Architecture guide
```

## Integration Points

### Required Imports
```typescript
// UI Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Context
import { useCollaboration } from "@/contexts/CollaborationContext";

// Auth
import { useAuth, useUser } from "@clerk/clerk-react";

// Icons
import { Users } from "lucide-react";
```

### Context Dependencies
```typescript
// CollaborationContext must provide:
interface CollaborationContextType {
  activeUsers: CollaborationUser[];
  isConnected: boolean;
  // ... other properties
}
```

## Testing Strategy

### Unit Tests
```typescript
- OnlineUsers renders correctly with 0 users (returns null)
- OnlineUsers renders correctly with 1-3 users (no overflow)
- OnlineUsers renders correctly with 4+ users (with overflow)
- Overflow button opens popover
- Popover displays all users
- Responsive classes apply correctly
```

### Integration Tests
```typescript
- BoardHeader integrates with OnlineUsers
- Search bar works alongside OnlineUsers
- Board title displays correctly
- Layout adapts to screen size changes
```

### E2E Tests
```typescript
- Multiple users see each other online
- Users disappear when they leave
- Colors are consistent across clients
- Tooltips show correct information
- Popover navigation works
```

## Accessibility

```
- Tooltips for avatar hover
- ARIA labels for buttons
- Keyboard navigation support
- Screen reader friendly
- Color-blind friendly indicators
```

## Browser Support Matrix

| Browser        | Version | Status |
|---------------|---------|--------|
| Chrome        | 90+     | ✅      |
| Firefox       | 88+     | ✅      |
| Safari        | 14+     | ✅      |
| Edge          | 90+     | ✅      |
| Mobile Safari | 14+     | ✅      |
| Mobile Chrome | 90+     | ✅      |
