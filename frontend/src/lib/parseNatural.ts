import { 
  format, 
  addDays, 
  nextDay, 
  parseISO, 
  isValid,
  startOfDay 
} from 'date-fns';
import { TaskPriority } from '@/types/task';

export interface ParsedTask {
  title: string;
  description?: string;
  dueAt: Date;
  priority: TaskPriority;
  tags: string[];
  subtasks?: string[];
}

export function parseNaturalLanguage(input: string): ParsedTask {
  let cleanedInput = input.trim();
  const result: ParsedTask = {
    title: '',
    dueAt: new Date(), // Default: today
    priority: 'Medium',
    tags: [],
  };

  // Extract tags (#keyword)
  const tagMatches = cleanedInput.match(/#\w+/g);
  if (tagMatches) {
    result.tags = tagMatches.map(tag => tag.substring(1).toLowerCase());
    cleanedInput = cleanedInput.replace(/#\w+/g, '').trim();
  }

  // Extract priority keywords
  const priorityPatterns = [
    { pattern: /\b(urgent|critical|high)\b/i, priority: 'High' as TaskPriority },
    { pattern: /\b(important|medium|normal)\b/i, priority: 'Medium' as TaskPriority },
    { pattern: /\b(low|minor|later)\b/i, priority: 'Low' as TaskPriority },
  ];

  for (const { pattern, priority } of priorityPatterns) {
    if (pattern.test(cleanedInput)) {
      result.priority = priority;
      cleanedInput = cleanedInput.replace(pattern, '').trim();
      break;
    }
  }

  // Remove duration patterns and time patterns (since we only care about dates)
  const removePatterns = [
    // Duration patterns
    /\bfor\s+(\d+(?:\.\d+)?)\s*(h|hr|hour|hours|m|min|minute|minutes)\b/gi,
    // Time patterns
    /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi,
    /\b\d{1,2}:\d{2}\b/g,
    /\b\d{1,2}\s*(?:o'?clock)?\b/g
  ];

  for (const pattern of removePatterns) {
    cleanedInput = cleanedInput.replace(pattern, '').trim();
  }

  // Extract date information
  const now = new Date();
  let targetDate = startOfDay(now); // Default to today
  const datePatterns = [
    // Relative dates
    { pattern: /\btoday\b/i, action: () => targetDate },
    { pattern: /\btomorrow\b/i, action: () => addDays(targetDate, 1) },
    { pattern: /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, action: (match: RegExpMatchArray) => {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayIndex = dayNames.indexOf(match[1].toLowerCase());
      return nextDay(targetDate, targetDayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    }},
    // Weekday names (this week)
    { pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, action: (match: RegExpMatchArray) => {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayIndex = dayNames.indexOf(match[1].toLowerCase());
      const today = new Date();
      const todayDayIndex = today.getDay();
      
      // If target day is today or in the future this week, use this week
      if (targetDayIndex >= todayDayIndex) {
        return addDays(today, targetDayIndex - todayDayIndex);
      } else {
        // Otherwise, use next week
        return nextDay(today, targetDayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6);
      }
    }},
  ];

  for (const { pattern, action } of datePatterns) {
    const dateMatch = cleanedInput.match(pattern);
    if (dateMatch) {
      targetDate = action(dateMatch);
      cleanedInput = cleanedInput.replace(dateMatch[0], '').trim();
      break;
    }
  }

  // Set the final date (date only, no time)
  result.dueAt = targetDate;

  // Clean up the title (remove extra spaces and common words)
  result.title = cleanedInput
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/\b(at|on|by|for|in)\b/gi, '') // Remove common prepositions
    .trim();

  // If title is empty, use a default
  if (!result.title) {
    result.title = 'New Task';
  }

  return result;
}

// Helper function to format the parsed task for display
export function formatParsedTask(parsed: ParsedTask): string {
  const dateStr = format(parsed.dueAt, 'MMM dd, yyyy');
  const tagsStr = parsed.tags.length > 0 ? ` #${parsed.tags.join(' #')}` : '';
  
  return `"${parsed.title}" - ${dateStr} - ${parsed.priority} priority${tagsStr}`;
}