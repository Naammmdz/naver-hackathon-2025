# User Profile with Avatar Picker

This feature allows users to choose from default avatars stored in `/frontend/public/avatars/`.

## Components

### 1. `AvatarPicker` (`/components/ui/avatar-picker.tsx`)
A reusable component that displays a grid of available avatars for selection.

### 2. `CustomUserProfile` (`/components/auth/CustomUserProfile.tsx`)
A custom profile dialog that integrates with Clerk and includes the avatar picker.

### 3. `UserProfileButton` (`/components/auth/UserProfileButton.tsx`)
Two options for integrating the custom profile:
- `CustomUserProfileButton`: Full custom implementation
- `EnhancedUserButton`: Extends Clerk's UserButton

## Usage

### Option 1: Replace UserButton with CustomUserProfileButton

In your sidebar or header component:

```tsx
import { CustomUserProfileButton } from '@/components/auth/UserProfileButton';

// Replace:
// <UserButton />

// With:
<CustomUserProfileButton />
```

### Option 2: Use in ClickupAppSidebar

Edit `/frontend/src/components/layout/ClickupAppSidebar.tsx`:

```tsx
// At the top, add import
import { CustomUserProfileButton } from '@/components/auth/UserProfileButton';

// Replace lines 156-162:
<div className="flex flex-col items-center gap-0.5 mt-2">
  <CustomUserProfileButton />
  <span className="text-[10px] text-sidebar-primary-foreground font-medium text-center leading-tight">
    Profile
  </span>
</div>
```

### Option 3: Use as a Standalone Dialog

```tsx
import { CustomUserProfile } from '@/components/auth/CustomUserProfile';
import { useState } from 'react';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Open Profile
      </button>
      <CustomUserProfile open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
```

## Adding More Avatars

1. Add avatar images to `/frontend/public/avatars/`
   - Name them: `avatar-6.png`, `avatar-7.png`, etc.
   - Recommended size: 256x256px or larger (square)
   - Supported formats: PNG, JPG, JPEG, SVG, GIF, WebP

2. Update `/frontend/src/lib/defaultAvatars.ts`:

```typescript
export const DEFAULT_AVATARS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',  // Add new ones here
  '/avatars/avatar-7.png',
];
```

## How It Works

1. **User clicks "Choose Avatar"** in the profile dialog
2. **Avatar picker appears** showing all available default avatars
3. **User selects an avatar** from the grid
4. **Avatar is uploaded to Clerk** using `user.setProfileImage()`
5. **Success notification** appears and the dialog closes

## Customization

### Change Grid Layout

Edit the grid in `avatar-picker.tsx`:

```tsx
// Change from 5 columns to 3:
<div className="grid grid-cols-3 gap-3">
```

### Change Avatar Size in Grid

```tsx
// Add specific size class
<div className="grid grid-cols-5 gap-3">
  {DEFAULT_AVATARS.map((avatarUrl) => (
    <button
      className="w-20 h-20 ..." // Add fixed size
    >
```

### Customize Dialog Appearance

Edit `CustomUserProfile.tsx`:

```tsx
<DialogContent className="sm:max-w-[600px]"> // Change width
```

## Notes

- Avatars are stored publicly in `/frontend/public/avatars/`
- Clerk handles the actual avatar storage and serving
- The same avatar can be used by multiple users
- Users can still upload custom avatars via Clerk's interface
- Avatar selection is persistent across sessions
