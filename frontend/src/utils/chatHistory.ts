type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

const CHAT_HISTORY_KEY = 'global-ai-chat-history';
const MAX_HISTORY_ITEMS = 50;

export function getChatHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!stored) return [];
    
    const messages = JSON.parse(stored);
    // Filter out welcome message
    return messages.filter((msg: ChatMessage) => msg.id !== 'assistant-welcome');
  } catch (error) {
    console.error('Error reading chat history:', error);
    return [];
  }
}

export function saveChatMessage(message: ChatMessage): void {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getChatHistory();
    const updated = [...history, message];
    
    // Keep only last MAX_HISTORY_ITEMS
    const trimmed = updated.slice(-MAX_HISTORY_ITEMS);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving chat message:', error);
  }
}

export function getRecentChatMessages(limit: number = 5): ChatMessage[] {
  const history = getChatHistory();
  return history.slice(-limit);
}

