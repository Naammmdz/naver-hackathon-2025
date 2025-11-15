// Shared user color utility - ensures consistent colors across the app
// Used by useUserIdentityAwareness, DocumentEditor (BlockNote), and OnlineUsers

export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A8E6CF'
];

/**
 * Get a consistent color for a user based on their ID
 * This ensures the same user always gets the same color across the app
 */
export function getColor(id: string): string {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return USER_COLORS[hash % USER_COLORS.length];
}

