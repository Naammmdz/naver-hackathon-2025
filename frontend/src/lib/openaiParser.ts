import OpenAI from 'openai';
import { ParsedTask } from './parseNatural';

// Get API key from environment variables (server-side configuration)
function getOpenAIKey(): string | null {
  // Use environment variable for production/development
  if (import.meta.env?.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY;
  }
  
  // Fallback to process.env for Node.js environments
  if (typeof process !== 'undefined' && process.env?.VITE_OPENAI_API_KEY) {
    return process.env.VITE_OPENAI_API_KEY;
  }
  
  return null;
}

// Create the system prompt for task parsing
function createSystemPrompt(): string {
  return `You are a task parsing assistant. Parse natural language input into structured task data.

Return ONLY a JSON object with this exact structure:
{
  "title": "cleaned task title",
  "description": "brief helpful description (2-3 sentences)",
  "dueAt": "ISO date string (YYYY-MM-DD)",
  "priority": "Low" | "Medium" | "High", 
  "tags": ["tag1", "tag2"]
}Rules:
1. Extract and clean the main task title (keep it concise)
2. Generate a brief, helpful description (2-3 sentences) that provides context and clarifies what needs to be done
3. Parse dates: "today", "tomorrow", "next Monday", "Friday", etc.
4. If no date specified, use today
5. IGNORE time specifications (5pm, 9am, etc.) - only extract the date
6. Parse priorities: urgent/critical/high -> "High", important/medium/normal -> "Medium", low/minor/later -> "Low"
7. Extract hashtags as tags (remove #)
8. Suggest relevant tags based on task content (work, personal, study, meeting, etc.)
9. Default priority is "Medium"
10. Current date reference: ${new Date().toISOString().split('T')[0]}

Examples:
Input: "Finish essay next Monday high #english"
Output: {"title":"Finish essay","description":"Complete the English essay assignment with proper research, citations, and formatting before the deadline.","dueAt":"2025-09-15","priority":"High","tags":["english","writing","academic"]}

Input: "Buy groceries tomorrow"
Output: {"title":"Buy groceries","description":"Purchase weekly groceries including fresh produce, dairy, and household essentials.","dueAt":"2025-09-15","priority":"Medium","tags":["shopping","groceries","personal"]}`;
}

export async function parseWithOpenAI(input: string): Promise<ParsedTask | null> {
  const apiKey = getOpenAIKey();
  
  if (!apiKey) {
    console.warn('OpenAI API key not found. Falling back to local parser.');
    return null;
  }
  


  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Allow usage in browser environment
      baseURL: 'https://api.openai.com/v1', // Explicitly set base URL
    });

    // Create chat completion
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: createSystemPrompt()
        },
        {
          role: 'user',
          content: input
        }
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content.trim());
    
    // Validate and convert the response to ParsedTask format
    const parsedTask: ParsedTask = {
      title: parsed.title || 'New Task',
      description: parsed.description || undefined,
      dueAt: new Date(parsed.dueAt),
      priority: parsed.priority || 'Medium',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };

    // Validate the date
    if (isNaN(parsedTask.dueAt.getTime())) {
      throw new Error('Invalid date in OpenAI response');
    }

    return parsedTask;

  } catch (error: any) {
    // Provide more specific error information
    if (error.status === 429) {
      console.error('OpenAI rate limit exceeded:', error.message);
      throw new Error('429 You exceeded your current quota, please check your plan and billing details.');
    } else if (error.status === 401) {
      console.error('OpenAI API key invalid:', error.message);
      throw new Error('API key invalid or missing permissions.');
    } else if (error.status === 400) {
      console.error('OpenAI bad request:', error.message);
      throw new Error('Invalid request to OpenAI API.');
    } else {
      console.error('OpenAI parsing failed:', error);
      throw error;
    }
  }
}

// Function to check if API key is configured
export function hasOpenAIKey(): boolean {
  return !!getOpenAIKey();
}