// Default avatar images for users without custom avatars
// These will be randomly assigned based on user ID
export const DEFAULT_AVATARS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  
];

/**
 * Get a consistent random avatar for a user based on their ID
 * @param userId - The user's unique identifier
 * @returns A URL to a default avatar image
 */
export function getDefaultAvatar(userId: string): string {
  // Create a hash from the userId to get a consistent index
  const hash = userId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
}, 0);
  
  const index = hash % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
}
