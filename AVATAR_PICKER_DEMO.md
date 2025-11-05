# Avatar Picker Feature - Implementation Guide

## ✅ What's Been Added

I've implemented a custom avatar picker that allows users to choose from the default avatars in `/frontend/public/avatars/`.

### New Components Created:

1. **`/frontend/src/components/ui/avatar-picker.tsx`**
   - Displays a grid of available avatars
   - Allows users to select an avatar with visual feedback
   - Integrates with Clerk's user API

2. **`/frontend/src/components/auth/CustomUserProfile.tsx`**
   - Custom profile dialog similar to Clerk's default one
   - Includes the avatar picker
   - Shows user info (username, email, name)
   - Allows avatar selection, upload, and removal

3. **`/frontend/src/components/auth/UserProfileButton.tsx`**
   - Wrapper components for easy integration
   - `CustomUserProfileButton`: Opens the custom profile dialog
   - `EnhancedUserButton`: Enhanced Clerk's UserButton


## 🎯 How to Use

### Option A: Keep Clerk's Profile (Recommended)
Your existing Clerk profile dialog works as-is. The avatar picker components are available when you want to add custom avatar selection to any part of your app.

### Option B: Add Avatar Picker to a Custom Page
Use the components in your own settings page, user profile page, or anywhere else:

```tsx
import { AvatarPicker } from '@/components/ui/avatar-picker';
import { useUser } from '@clerk/clerk-react';

function MySettingsPage() {
  const { user } = useUser();
  
  const handleAvatarSelect = async (avatarUrl: string) => {
    const absoluteUrl = `${window.location.origin}${avatarUrl}`;
    await user?.setProfileImage({ file: absoluteUrl });
  };
  
  return (
    <div>
      <h2>Choose Your Avatar</h2>
      <AvatarPicker onSelect={handleAvatarSelect} />
    </div>
  );
}
```

### Option C: Replace Clerk's UserButton (Optional)
Only if you want full control, replace `<UserButton />` with `<CustomUserProfileButton />` in your sidebar.

### Current Available Avatars:
- `/avatars/avatar-1.png`
- `/avatars/avatar-2.png`
- `/avatars/avatar-3.png`
- `/avatars/avatar-4.png`
- `/avatars/avatar-5.png`

## 📸 Features

✅ **Grid-based avatar selection** (5 avatars in a grid)
✅ **Visual feedback** (selected avatar is highlighted)
✅ **Persistent storage** (saved via Clerk API)
✅ **Remove avatar** option
✅ **Upload custom avatar** placeholder
✅ **Responsive design**
✅ **Toast notifications** for success/error
✅ **Integration with existing Clerk auth**

## 🔧 Adding More Avatars

### Step 1: Add avatar images
Add new avatar files to `/frontend/public/avatars/`:
```
avatar-6.png
avatar-7.png
avatar-8.png
```

### Step 2: Update the avatar list
Edit `/frontend/src/lib/defaultAvatars.ts`:
```typescript
export const DEFAULT_AVATARS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',  // New
  '/avatars/avatar-7.png',  // New
  '/avatars/avatar-8.png',  // New
];
```

That's it! The new avatars will automatically appear in the picker.

## 🎨 Customization Options

### Change Grid Layout
To show 3 columns instead of 5:
```tsx
// In avatar-picker.tsx, line 26
<div className="grid grid-cols-3 gap-3">
```

### Change Avatar Display Size
```tsx
// In CustomUserProfile.tsx, line 53
<Avatar className="h-20 w-20"> // Change from h-16 w-16
```

### Customize Dialog Width
```tsx
// In CustomUserProfile.tsx, line 43
<DialogContent className="sm:max-w-[600px]"> // Change from 500px
```

## 🧪 Testing the Feature

1. **Start your dev server**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Log in to your app**

3. **Click the Profile button** in the sidebar (bottom left)

4. **Click "Choose Avatar"**

5. **Select an avatar** from the grid

6. **Click "Select Avatar"** to confirm

7. **See the success toast** and your new avatar!

## 🔄 Alternative Integration Methods

### If you want to use it elsewhere in your app:

**In any component:**
```tsx
import { CustomUserProfileButton } from '@/components/auth/UserProfileButton';

// Use it like this:
<CustomUserProfileButton />
```

**As a standalone dialog:**
```tsx
import { CustomUserProfile } from '@/components/auth/CustomUserProfile';
import { useState } from 'react';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Edit Profile</button>
      <CustomUserProfile open={open} onOpenChange={setOpen} />
    </>
  );
}
```

## 📝 Notes

- The feature integrates seamlessly with Clerk authentication
- Avatars are stored publicly in `/frontend/public/avatars/`
- Clerk handles the actual avatar hosting after selection
- Users can still use Clerk's full profile page for advanced settings
- Avatar changes are reflected immediately across the app

## 🐛 Troubleshooting

**Issue: Avatars not showing**
- Check that avatar files exist in `/frontend/public/avatars/`
- Verify the paths in `defaultAvatars.ts` match the actual files

**Issue: "Failed to update avatar" error**
- Ensure you're logged in
- Check browser console for detailed error messages
- Verify Clerk API is working correctly

**Issue: Dialog not opening**
- Check that `CustomUserProfileButton` is imported correctly
- Verify the Dialog component from shadcn/ui is installed

## 🎉 You're All Set!

The avatar picker feature is now ready to use. Users can click on the Profile button in the sidebar and choose from the available avatars.
