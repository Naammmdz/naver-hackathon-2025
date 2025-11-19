// Avatar color generation utility
// Generates consistent, high-contrast colors for user avatars

type AvatarColor = {
  bg: string;
  text: string;
};

const AVATAR_COLORS: AvatarColor[] = [
  { bg: 'bg-blue-600', text: 'text-white' },
  { bg: 'bg-purple-600', text: 'text-white' },
  { bg: 'bg-pink-600', text: 'text-white' },
  { bg: 'bg-red-600', text: 'text-white' },
  { bg: 'bg-orange-600', text: 'text-white' },
  { bg: 'bg-amber-600', text: 'text-white' },
  { bg: 'bg-lime-600', text: 'text-white' },
  { bg: 'bg-green-600', text: 'text-white' },
  { bg: 'bg-emerald-600', text: 'text-white' },
  { bg: 'bg-teal-600', text: 'text-white' },
  { bg: 'bg-cyan-600', text: 'text-white' },
  { bg: 'bg-sky-600', text: 'text-white' },
  { bg: 'bg-indigo-600', text: 'text-white' },
  { bg: 'bg-violet-600', text: 'text-white' },
  { bg: 'bg-fuchsia-600', text: 'text-white' },
  { bg: 'bg-rose-600', text: 'text-white' },
];

/**
 * Generate a consistent color for a user based on their ID
 * Uses a simple hash function to ensure the same user always gets the same color
 */
export function getAvatarColor(userId: string): AvatarColor {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Get initials from a name or fallback to first character of ID
 */
export function getInitials(name: string | undefined, fallbackId: string): string {
  if (!name) {
    return fallbackId.charAt(0).toUpperCase();
  }
  
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}
