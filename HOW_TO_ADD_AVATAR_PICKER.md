# How to Add Avatar Picker to Clerk Profile

This guide shows how to add avatar selection **without changing** your existing Clerk profile setup.

## 🎯 What You Get

Three reusable components that work with your existing Clerk authentication:

1. **`AvatarPicker`** - Grid of selectable avatars
2. **`EnhancedUserButton`** - Adds "Choose default avatar" menu item to Clerk's UserButton
3. **`CustomUserProfile`** - Complete custom profile dialog (if you want full control later)

## ✅ Easiest Method: Add Menu Item to Existing UserButton

Replace your current `<UserButton />` with `<EnhancedUserButton />`:

### In `ClickupAppSidebar.tsx`:

```tsx
// Change this import:
import { UserButton } from '@clerk/clerk-react';

// To this:
import { EnhancedUserButton } from '@/components/auth/EnhancedUserButton';

// Then replace:
<UserButton
  appearance={{
    elements: {
      avatarBox: 'h-8 w-8 rounded-lg',
    },
  }}
/>

// With:
<EnhancedUserButton />
```

That's it! Now when users click the profile button, they'll see:
- ✅ All original Clerk profile options (Manage account, Sign out, etc.)
- ✅ **NEW:** "Choose default avatar 🎭" menu item
- ✅ Clicking it opens the avatar picker dialog

## 📦 What's Included

### Available Components:

**`/frontend/src/components/ui/avatar-picker.tsx`**
- Grid of 5 avatars from `/frontend/public/avatars/`
- Visual selection feedback
- Integrates with Clerk's API

**`/frontend/src/components/auth/EnhancedUserButton.tsx`** ⭐ **USE THIS**
- Keeps Clerk's original UserButton
- Adds "Choose default avatar" menu item
- Opens avatar picker dialog

**`/frontend/src/components/auth/CustomUserProfile.tsx`**
- Complete custom profile dialog
- Use only if you want to replace Clerk's profile entirely

**`/frontend/src/components/auth/UserProfileButton.tsx`**
- Alternative custom implementations

## 🎨 Current Avatars

Located in `/frontend/public/avatars/`:
- `avatar-1.png`
- `avatar-2.png`
- `avatar-3.png`
- `avatar-4.png`
- `avatar-5.png`

## 📝 Adding More Avatars

1. Add image files to `/frontend/public/avatars/` (e.g., `avatar-6.png`)
2. Update `/frontend/src/lib/defaultAvatars.ts`:

```typescript
export const DEFAULT_AVATARS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',  // Add new ones
];
```

## 🔧 Other Usage Options

### Use Avatar Picker Anywhere

In any component:

```tsx
import { AvatarPicker } from '@/components/ui/avatar-picker';
import { useUser } from '@clerk/clerk-react';

function MyComponent() {
  const { user } = useUser();
  
  const handleSelect = async (avatarUrl: string) => {
    const absoluteUrl = `${window.location.origin}${avatarUrl}`;
    await user?.setProfileImage({ file: absoluteUrl });
  };
  
  return <AvatarPicker onSelect={handleSelect} />;
}
```

### Use in a Settings Page

```tsx
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AvatarPicker } from '@/components/ui/avatar-picker';

function SettingsPage() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setOpen(true)}>
        Change Avatar
      </button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <AvatarPicker 
            onSelect={handleSelect}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## ✨ Summary

- ✅ **No changes to existing Clerk profile** - it still works exactly the same
- ✅ **Simple one-line change** - Replace `<UserButton />` with `<EnhancedUserButton />`
- ✅ **Adds avatar picker** as a new menu item
- ✅ **All components are ready to use** - no additional setup needed
- ✅ **Works with Clerk's API** - avatars are saved properly

## 🎉 That's It!

Your existing Clerk profile stays intact, and you now have avatar selection as an additional feature!
