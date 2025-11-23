import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div 
      className={cn("ai-markdown max-w-none text-inherit font-sans break-words", className)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Override default elements to use theme colors
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />
          ),
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return isInline ? (
              <code className="bg-muted/30 px-1.5 py-0.5 rounded text-sm font-mono text-inherit" {...props}>
                {children}
              </code>
            ) : (
              <code className={cn("text-sm", className)} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ node, children, ...props }) => (
            <pre className="bg-muted/30 p-3 rounded-lg overflow-x-auto my-2 text-sm" {...props}>
              {children}
            </pre>
          ),
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="text-inherit" {...props} />,
          p: ({ node, ...props }) => <p className="my-2 leading-relaxed text-inherit" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-lg font-bold my-3 text-inherit" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-base font-bold my-2 text-inherit" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-sm font-bold my-2 text-inherit" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-inherit" {...props} />,
          em: ({ node, ...props }) => <em className="italic text-inherit" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-2 border-primary/50 pl-3 italic my-2 text-inherit opacity-90" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
