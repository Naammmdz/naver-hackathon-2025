import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none break-words w-full", className)}>
      <ReactMarkdown
        components={{
          // Override default elements if needed
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />
          ),
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return isInline ? (
              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ node, children, ...props }) => (
            <pre className="bg-muted p-2 rounded-lg overflow-x-auto my-2" {...props}>
              {children}
            </pre>
          ),
          ul: ({ node, ...props }) => <ul className="list-disc pl-4 my-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-4 my-1" {...props} />,
          li: ({ node, ...props }) => <li className="my-0.5" {...props} />,
          p: ({ node, ...props }) => <p className="my-1 leading-relaxed" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-lg font-bold my-2" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-base font-bold my-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-sm font-bold my-1" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-2 border-primary/50 pl-2 italic my-2 text-muted-foreground" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
