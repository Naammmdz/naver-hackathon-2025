/**
 * Markdown ↔ BlockNote Converter
 * 
 * Converts between Markdown (stored in DB) and BlockNote JSON (used in editor)
 */

interface BlockNoteBlock {
  type: string;
  content?: string | BlockNoteInlineContent[];
  props?: Record<string, any>;
  children?: BlockNoteBlock[];
}

interface BlockNoteInlineContent {
  type: string;
  text?: string;
  styles?: Record<string, any>;
  href?: string;
}

/**
 * Convert BlockNote JSON blocks to Markdown
 */
export function blockNoteToMarkdown(blocks: any[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const block of blocks) {
    const markdown = convertBlockToMarkdown(block);
    if (markdown) {
      lines.push(markdown);
    }
  }

  return lines.join('\n\n');
}

function convertBlockToMarkdown(block: BlockNoteBlock): string {
  if (!block || typeof block !== 'object') {
    return '';
  }

  const { type, content, props = {}, children = [] } = block;

  // Extract text content from content (can be string or array of inline content)
  const textContent = extractTextContent(content);

  switch (type) {
    case 'heading': {
      const level = props.level || 1;
      const prefix = '#'.repeat(Math.min(level, 6));
      return `${prefix} ${textContent}`;
    }

    case 'paragraph':
      return textContent || '';

    case 'bulletListItem':
      return `- ${textContent}`;

    case 'numberedListItem':
      return `1. ${textContent}`;

    case 'checkListItem': {
      const checked = props.checked ? 'x' : ' ';
      return `- [${checked}] ${textContent}`;
    }

    case 'codeBlock': {
      const language = props.language || '';
      return `\`\`\`${language}\n${textContent}\n\`\`\``;
    }

    case 'blockquote':
      return `> ${textContent}`;

    case 'table': {
      // BlockNote tables are complex, simplified conversion
      return textContent;
    }

    case 'image': {
      const url = props.url || '';
      const caption = props.caption || textContent || '';
      return `![${caption}](${url})`;
    }

    default:
      return textContent;
  }
}

function extractTextContent(content: string | BlockNoteInlineContent[] | undefined): string {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (typeof item === 'object' && 'text' in item) {
          let text = item.text || '';
          
          // Apply markdown formatting based on styles
          if (item.styles) {
            if (item.styles.bold) text = `**${text}**`;
            if (item.styles.italic) text = `*${text}*`;
            if (item.styles.code) text = `\`${text}\``;
            if (item.styles.strikethrough) text = `~~${text}~~`;
          }
          
          // Handle links
          if (item.type === 'link' && item.href) {
            text = `[${text}](${item.href})`;
          }
          
          return text;
        }
        return '';
      })
      .join('');
  }

  return String(content);
}

/**
 * Convert Markdown to BlockNote JSON blocks
 */
export function markdownToBlockNote(markdown: string): any[] {
  if (!markdown || typeof markdown !== 'string') {
    return [];
  }

  const lines = markdown.split('\n');
  const blocks: any[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        codeBlockLanguage = line.slice(3).trim();
        codeBlockContent = [];
      } else {
        // End of code block
        inCodeBlock = false;
        blocks.push({
          type: 'codeBlock',
          content: codeBlockContent.join('\n'),
          props: {
            language: codeBlockLanguage || 'plaintext'
          }
        });
        codeBlockContent = [];
        codeBlockLanguage = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Skip empty lines
    if (!line.trim()) {
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        content: parseInlineContent(headingMatch[2]),
        props: {
          level: headingMatch[1].length
        }
      });
      continue;
    }

    // Bullet list
    if (line.match(/^\s*[-*+]\s+/)) {
      const content = line.replace(/^\s*[-*+]\s+/, '');
      
      // Check if it's a checkbox
      const checkboxMatch = content.match(/^\[([ x])\]\s+(.+)$/);
      if (checkboxMatch) {
        blocks.push({
          type: 'checkListItem',
          content: parseInlineContent(checkboxMatch[2]),
          props: {
            checked: checkboxMatch[1] === 'x'
          }
        });
      } else {
        blocks.push({
          type: 'bulletListItem',
          content: parseInlineContent(content)
        });
      }
      continue;
    }

    // Numbered list
    if (line.match(/^\s*\d+\.\s+/)) {
      const content = line.replace(/^\s*\d+\.\s+/, '');
      blocks.push({
        type: 'numberedListItem',
        content: parseInlineContent(content)
      });
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const content = line.replace(/^>\s*/, '');
      blocks.push({
        type: 'blockquote',
        content: parseInlineContent(content)
      });
      continue;
    }

    // Image
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      blocks.push({
        type: 'image',
        props: {
          url: imageMatch[2],
          caption: imageMatch[1]
        }
      });
      continue;
    }

    // Default: paragraph
    blocks.push({
      type: 'paragraph',
      content: parseInlineContent(line)
    });
  }

  return blocks;
}

/**
 * Parse inline markdown formatting (bold, italic, code, links)
 */
function parseInlineContent(text: string): BlockNoteInlineContent[] {
  if (!text) {
    return [{ type: 'text', text: '', styles: {} }];
  }

  // Simple implementation - can be enhanced with proper markdown parser
  const parts: BlockNoteInlineContent[] = [];
  let currentText = text;

  // For now, return as plain text
  // TODO: Implement proper inline markdown parsing (bold, italic, links, etc.)
  parts.push({
    type: 'text',
    text: currentText,
    styles: {}
  });

  return parts;
}

/**
 * Detect if content is Markdown or BlockNote JSON
 */
export function detectContentFormat(content: string | any[]): 'markdown' | 'blocknote' | 'unknown' {
  // If it's already an array, it's BlockNote
  if (Array.isArray(content)) {
    return 'blocknote';
  }

  if (typeof content !== 'string' || !content.trim()) {
    return 'unknown';
  }

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return 'blocknote';
    }
  } catch {
    // Not JSON, likely markdown
  }

  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s/m,           // Headings
    /^\s*[-*+]\s/m,         // Bullet lists
    /^\s*\d+\.\s/m,         // Numbered lists
    /^>/m,                  // Blockquotes
    /```/,                  // Code blocks
    /!\[.*\]\(.*\)/,        // Images
    /\[.*\]\(.*\)/          // Links
  ];

  for (const pattern of markdownPatterns) {
    if (pattern.test(content)) {
      return 'markdown';
    }
  }

  // If has line breaks and plain text, likely markdown
  if (content.includes('\n') && !content.startsWith('[')) {
    return 'markdown';
  }

  return 'unknown';
}

/**
 * Safe content parser - handles both Markdown and BlockNote JSON
 */
export function parseDocumentContent(content: string | null | undefined): any[] {
  if (!content) {
    return [];
  }

  const format = detectContentFormat(content);

  switch (format) {
    case 'blocknote':
      try {
        const parsed = JSON.parse(content as string);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }

    case 'markdown':
      return markdownToBlockNote(content as string);

    case 'unknown':
    default:
      // Try to treat as plain text
      if (typeof content === 'string' && content.trim()) {
        return [{
          type: 'paragraph',
          content: content
        }];
      }
      return [];
  }
}
