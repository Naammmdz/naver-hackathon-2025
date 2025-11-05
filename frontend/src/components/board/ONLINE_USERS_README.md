# Online Users Feature

This feature displays who is currently online and editing the workspace, similar to Google Docs.

## Components

### 1. `OnlineUsers.tsx`
A reusable component that displays active users with their avatars in a compact, space-efficient way.

**Features:**
- Shows up to N users with avatars (configurable)
- Overflow indicator (+X) for additional users
- Popover to view all online users when clicking the overflow indicator
- Color-coded avatars for each user
- Online status indicators
- Responsive design that adapts to available space
- Tooltips on hover showing user details

**Props:**
```typescript
interface OnlineUsersProps {
  maxVisible?: number;     // Default: 3 - Max avatars to show before overflow
  size?: "sm" | "md" | "lg"; // Default: "sm" - Avatar size
  showLabel?: boolean;     // Default: true - Show "X users online" text
  className?: string;      // Additional CSS classes
}
```

**Usage:**
```tsx
import { OnlineUsers } from '@/components/board/OnlineUsers';

// Basic usage
<OnlineUsers />

// Custom configuration
<OnlineUsers 
  maxVisible={5} 
  size="md" 
  showLabel={false}
  className="ml-4"
/>
```

### 2. `BoardHeader.tsx`
A header component for the board view that includes:
- Board title
- Search bar
- Online users display

**Features:**
- Responsive layout that adapts to screen size
- Search functionality (callback-based)
- Integrates seamlessly with the board view
- Hides less important elements on small screens

**Props:**
```typescript
interface BoardHeaderProps {
  boardTitle?: string;           // Board name to display
  onSearch?: (query: string) => void; // Search callback
}
```

**Usage:**
```tsx
import { BoardHeader } from '@/components/board/BoardHeader';

<BoardHeader 
  boardTitle="My Project Board"
  onSearch={(query) => console.log('Searching for:', query)}
/>
```

## Integration with BoardView

The `BoardView.tsx` component has been updated to include the `BoardHeader`:

```tsx
import { BoardHeader } from './BoardHeader';

export function BoardView() {
  // ... existing code ...
  
  return (
    <div className="flex w-full h-full bg-background">
      <BoardSidebar />
      
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <BoardHeader boardTitle={activeBoard?.title || 'Board'} />
        <div className="flex-1 overflow-hidden">
          <CanvasContainer />
        </div>
      </div>
    </div>
  );
}
```

## Responsive Behavior

### Desktop (1024px+)
- Full board title visible
- Search bar with comfortable width
- Up to 3 user avatars visible
- "X users online" label shown

### Tablet (768px - 1023px)
- Board title visible
- Search bar takes flexible space
- Up to 2 user avatars visible
- "X users online" label shown

### Mobile (< 768px)
- Board title hidden to save space
- Search bar takes most available space
- Up to 2 user avatars visible
- "X users online" label hidden
- Overflow indicator still functional

## How It Works

### Real-time Collaboration
The component uses the `CollaborationContext` to:
1. Connect to WebSocket when entering a workspace
2. Track active users in real-time
3. Display user presence with colored avatars
4. Show online/offline status

### User Colors
Each user gets a consistent color based on their user ID:
- Colors are generated using a hash function
- Same user always gets the same color across sessions
- Colors are used for avatars, borders, and status indicators

### Space Management
When there's not enough space:
1. Labels are hidden first (responsive classes)
2. Number of visible avatars reduces
3. Board title hides on mobile
4. Search bar remains functional
5. Overflow indicator shows remaining user count

## Customization

### Changing Maximum Visible Users
Edit the `maxVisible` prop in `BoardHeader.tsx`:
```tsx
<OnlineUsers 
  maxVisible={5}  // Show up to 5 users before overflow
  size="sm" 
  showLabel={true} 
/>
```

### Changing Avatar Size
Choose from three sizes:
- `"sm"` - 28px (7rem) - Good for headers
- `"md"` - 32px (8rem) - Good for sidebars
- `"lg"` - 40px (10rem) - Good for emphasis

### Styling
The component uses Tailwind CSS classes and can be customized via:
1. `className` prop for container styling
2. CSS variables for colors (inherits from theme)
3. Component-level modifications for deeper changes

## Dependencies

Required UI components:
- `@/components/ui/avatar`
- `@/components/ui/tooltip`
- `@/components/ui/popover`
- `@/components/ui/input`

Required contexts:
- `@/contexts/CollaborationContext`

Required hooks:
- `@clerk/clerk-react` (useAuth, useUser)

## Future Enhancements

Possible improvements:
1. Show user cursors on the canvas
2. Display what each user is currently editing
3. Add user status messages (e.g., "Editing heading", "Drawing")
4. Click avatar to focus on user's location
5. Direct message functionality
6. User typing indicators
