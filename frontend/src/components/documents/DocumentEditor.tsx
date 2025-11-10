import { CustomSlashMenu } from '@/components/documents/LinkTaskSlashItem';
import { Document } from '@/types/document';
import { Task } from '@/types/task';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuth } from '@clerk/clerk-react';
import { useWorkspaceYjs } from '@/hooks/useWorkspaceYjs';

interface DocumentEditorProps {
  document: Document;
  isDark: boolean;
  canEditWorkspace: boolean;
  onTaskClick: (task: Task) => void;
  onChange: (content: any[]) => void;
}

export function DocumentEditor({
  document,
  isDark,
  canEditWorkspace,
  onTaskClick,
  onChange,
}: DocumentEditorProps) {
  const { isSignedIn, userId } = useAuth();
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  
  // Use workspace-level Yjs provider instead of creating separate provider
  const { provider, ydoc, isConnected } = useWorkspaceYjs({
    workspaceId: activeWorkspaceId,
    enabled: !!activeWorkspaceId && isSignedIn,
  });

  // Normalize BlockNote content to the shape replaceBlocks/setContent expects
  const sanitizeBlocks = (blocks: any[]): any[] => {
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return [{
        type: 'heading',
        content: [{ text: document?.title || 'Untitled' }],
        props: { level: 1 },
      }];
    }
    
    return blocks.map((block) => {
      if (!block || typeof block !== 'object') {
        return {
          type: 'paragraph',
          content: [],
        };
      }
      
      const safeBlock: any = { ...block };
      
      // Ensure type exists
      if (!safeBlock.type) {
        safeBlock.type = 'paragraph';
      }
      
      // CRITICAL: Ensure content is ALWAYS an array, never undefined/null
      if (safeBlock.content === undefined || safeBlock.content === null) {
        safeBlock.content = [];
      } else if (typeof safeBlock.content === 'string') {
        safeBlock.content = [{ text: safeBlock.content }];
      } else if (!Array.isArray(safeBlock.content)) {
        // If content is object or other invalid shape, try to extract text
        if (safeBlock.content && typeof safeBlock.content === 'object') {
          const text = safeBlock.content.text || safeBlock.content.toString();
          safeBlock.content = text ? [{ text: String(text) }] : [];
        } else {
          safeBlock.content = [];
        }
      } else {
        // Ensure each content item is an object with text property (inline content only)
        // CRITICAL: BlockNote content must be inline content (text, marks), NOT block nodes
        safeBlock.content = safeBlock.content
          .map((item: any) => {
            // Skip if item is a block node (has type property)
            if (item && typeof item === 'object' && item.type && item.type !== 'text') {
              console.warn('[DocSync] Skipping block node in content array', item);
              return null;
            }
            
            if (typeof item === 'string') {
              return { text: item };
            } else if (item && typeof item === 'object' && item.text !== undefined) {
              // Ensure it's inline content, not a block
              if (item.type && item.type !== 'text') {
                return null;
              }
              return { text: String(item.text || '') };
            } else if (item && typeof item === 'object') {
              // If it looks like a block, skip it
              if (item.type) {
                return null;
              }
              return { text: String(item || '') };
            } else {
              return { text: String(item || '') };
            }
          })
          .filter((item: any) => item !== null && item && item.text !== undefined);
        
        // If all items were filtered out, ensure at least empty array
        if (!Array.isArray(safeBlock.content)) {
          safeBlock.content = [];
        }
      }
      
      // Final safety check - content MUST be an array
      if (!Array.isArray(safeBlock.content)) {
        console.warn('[DocSync] Content is not array after sanitization, forcing empty array', safeBlock);
        safeBlock.content = [];
      }
      
      // Ensure children blocks are arrays if present
      // CRITICAL: Some block types (like heading) don't allow certain children types
      if (safeBlock.children !== undefined) {
        if (!Array.isArray(safeBlock.children)) {
          safeBlock.children = [];
        } else {
          // Recursively sanitize children
          const sanitizedChildren = sanitizeBlocks(safeBlock.children);
          
          // For heading blocks, BlockNote typically doesn't support children
          // Remove children from heading blocks to avoid "Invalid content" errors
          if (safeBlock.type === 'heading') {
            console.warn('[DocSync] Removing children from heading block (not supported by BlockNote)');
            safeBlock.children = [];
          } else {
            safeBlock.children = sanitizedChildren;
          }
        }
      }
      
      return safeBlock;
    }).filter(block => block !== null && block !== undefined);
  };

  // Helper to extract text from inline content (not block content)
  const extractInlineText = (content: any): string => {
    if (!content) return '';
    
    // If it's an array, extract text from inline content objects
    if (Array.isArray(content)) {
      return content
        .map((item: any) => {
          // Only extract text from inline content (objects with 'text' property)
          // Ignore block nodes (objects with 'type' property)
          if (item && typeof item === 'object' && 'text' in item && !('type' in item)) {
            return item.text || '';
          }
          // If it's a string, return it
          if (typeof item === 'string') {
            return item;
          }
          return '';
        })
        .join('');
    }
    
    // If it's a string, return it
    if (typeof content === 'string') {
      return content;
    }
    
    return '';
  };

  // Ensure document always starts with a heading 1
  const ensureTitleBlock = (content: any[]) => {
    if (!content || content.length === 0) {
      return [
        {
          type: 'heading',
          content: [{ text: document.title || 'Untitled' }],
          props: { level: 1 },
        },
      ];
    }

    const firstBlock = content[0];
    if (firstBlock.type !== 'heading' || firstBlock.props?.level !== 1) {
      // Extract text content from the first block (only inline content, not blocks)
      const firstBlockText = extractInlineText(firstBlock.content);

      return [
        {
          type: 'heading',
          content: [{ text: firstBlockText || document.title || 'Untitled' }],
          props: { level: 1 },
        },
        ...content.slice(1),
      ];
    }

    // Check if heading content is empty and fill it with document title
    const headingText = extractInlineText(firstBlock.content);

    if (!headingText.trim()) {
      // Ensure content is in correct format: array of inline content objects
      firstBlock.content = [{ text: document.title || 'Untitled' }];
    } else {
      // Ensure content format is correct (array of inline content objects)
      if (!Array.isArray(firstBlock.content)) {
        firstBlock.content = [{ text: headingText }];
      } else {
        // Filter out any block nodes, keep only inline content
        firstBlock.content = firstBlock.content
          .filter((item: any) => item && typeof item === 'object' && 'text' in item && !('type' in item))
          .map((item: any) => ({ text: item.text || '' }));
        
        // If no valid inline content, use the extracted text
        if (firstBlock.content.length === 0) {
          firstBlock.content = [{ text: headingText }];
        }
      }
    }

    return content;
  };

  // Create Y.XmlFragment for this document from workspace Y.Doc
  // BlockNote uses "document-store" as fragment name, but we need per-document fragments
  // Use document-specific fragment name: "document-{docId}"
  const fragment = ydoc && document?.id ? ydoc.getXmlFragment(`document-${document.id}`) : null;
  
  // Determine if collaboration should be enabled
  const collaborationEnabled = !!(provider && fragment && isConnected && document?.id);
  
  // Log collaboration setup
  useEffect(() => {
    if (provider) {
      const providerAny = provider as any;
      console.log('[BlockNote Collab] Setup check:');
      console.log('  - hasProvider:', !!provider);
      console.log('  - providerType:', provider?.constructor?.name);
      console.log('  - hasToken:', !!(providerAny.token || providerAny.config?.token || providerAny._token));
      console.log('  - tokenLocation:', providerAny.token ? 'token' : providerAny.config?.token ? 'config.token' : providerAny._token ? '_token' : 'not found');
      console.log('  - hasFragment:', !!fragment);
      console.log('  - fragmentName:', `document-${document?.id}`);
      console.log('  - isConnected:', isConnected);
      console.log('  - collaborationEnabled:', collaborationEnabled);
      console.log('  - documentId:', document?.id);
      console.log('  - workspaceId:', activeWorkspaceId);
      console.log('  - provider.status:', providerAny.status);
      console.log('  - provider.isConnected:', providerAny.isConnected);
    }
  }, [provider, fragment, isConnected, collaborationEnabled, document?.id, activeWorkspaceId]);

  // Track if we should create editor with collaboration
  // useCreateBlockNote doesn't recreate editor when config changes,
  // so we need to wait until collaboration is ready before creating editor
  const [shouldCreateCollabEditor, setShouldCreateCollabEditor] = useState(false);
  const [fragmentSynced, setFragmentSynced] = useState(false);
  
  // Wait for Yjs fragment to sync before creating editor
  // This prevents "Position out of range" errors when reloading
  useEffect(() => {
    if (!fragment || !provider || !isConnected) {
      setFragmentSynced(false);
      return;
    }
    
    const providerAny = provider as any;
    let statusTimeout: NodeJS.Timeout | null = null;
    let syncTimeout: NodeJS.Timeout | null = null;
    
    // Listen for sync events from Yjs provider
    const handleSync = () => {
      // Provider has synced initial state from server
      console.log('[BlockNote] Yjs fragment synced, ready to create editor');
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
      setFragmentSynced(true);
    };
    
    // Listen for status changes
    const handleStatusChange = (status: string) => {
      if (status === 'connected') {
        // Clear any existing timeout
        if (statusTimeout) {
          clearTimeout(statusTimeout);
        }
        // Give a small delay after connection to ensure initial sync completes
        statusTimeout = setTimeout(() => {
          setFragmentSynced(true);
        }, 300); // Delay to allow initial sync from server
      }
    };
    
    // Check if already connected
    if (providerAny.status === 'connected' || providerAny.isConnected) {
      // Already connected, wait a bit for sync
      syncTimeout = setTimeout(() => {
        setFragmentSynced(true);
      }, 300);
      
      // Also listen for sync events
      if (providerAny.on) {
        providerAny.on('sync', handleSync);
      }
      
      return () => {
        if (syncTimeout) {
          clearTimeout(syncTimeout);
        }
        if (statusTimeout) {
          clearTimeout(statusTimeout);
        }
        if (providerAny.off) {
          providerAny.off('sync', handleSync);
        }
      };
    } else {
      // Not connected yet, wait for connection
      if (providerAny.on) {
        providerAny.on('status', handleStatusChange);
        providerAny.on('sync', handleSync);
      }
      
      return () => {
        if (statusTimeout) {
          clearTimeout(statusTimeout);
        }
        if (syncTimeout) {
          clearTimeout(syncTimeout);
        }
        if (providerAny.off) {
          providerAny.off('status', handleStatusChange);
          providerAny.off('sync', handleSync);
        }
      };
    }
  }, [fragment, provider, isConnected]);
  
  // Track if we've already ensured heading 1 for this document
  const headingEnsuredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only set to true when collaboration is fully ready AND fragment has synced
    if (collaborationEnabled && provider && fragment && isConnected && fragmentSynced) {
      setShouldCreateCollabEditor(true);
    } else {
      // Reset when collaboration is not ready
      setShouldCreateCollabEditor(false);
    }
  }, [collaborationEnabled, provider, fragment, isConnected, fragmentSynced]);

  // Track error state to prevent corruption from spreading
  const [hasError, setHasError] = useState(false);
  const errorCountRef = useRef(0);
  const setEditorInstanceKeyRef = useRef<((key: string) => void) | null>(null);
  const setHasErrorRef = useRef<((hasError: boolean) => void) | null>(null);
  const hasErrorRef = useRef(false);
  
  // Store document title in ref to prevent editor re-render when title changes
  // This prevents cursor loss when title is updated
  const documentTitleRef = useRef(document?.title || 'Untitled');
  
  // Update title ref only when document.id changes (new document)
  // Not when title changes (to prevent editor re-render)
  useEffect(() => {
    if (document?.id) {
      documentTitleRef.current = document.title || 'Untitled';
    }
  }, [document?.id]); // Only depend on document.id, not document.title
  
  // Store setHasError in ref so EditorWrapper can access it
  useEffect(() => {
    setHasErrorRef.current = setHasError;
    hasErrorRef.current = hasError;
  }, [hasError]);
  
  // Reset error state and heading ensured flag when document changes
  useEffect(() => {
    setHasError(false);
    errorCountRef.current = 0;
    headingEnsuredRef.current.delete(document?.id || '');
  }, [document?.id]);
  
  // Create editor config - only include collaboration when ready
  const editorConfig = useMemo(() => {
    // If we've had any errors, disable collaboration immediately to prevent data loss
    if (hasError || errorCountRef.current > 0) {
      console.warn('[BlockNote Collab] Errors detected, disabling collaboration to prevent data loss');
      return {};
    }
    
    if (shouldCreateCollabEditor && provider && fragment) {
      const providerAny = provider as any;
      const config = {
        collaboration: {
          provider: provider as any,
          fragment: fragment,
          user: {
            name: userId || 'Anonymous',
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          },
        },
      };
      console.log('[BlockNote Collab] Editor config WITH collaboration:');
      console.log('  - hasProvider:', !!config.collaboration.provider);
      console.log('  - providerType:', config.collaboration.provider?.constructor?.name);
      console.log('  - provider.status:', providerAny.status);
      console.log('  - hasFragment:', !!config.collaboration.fragment);
      console.log('  - fragmentName:', `document-${document?.id}`);
      console.log('  - user:', JSON.stringify(config.collaboration.user));
      return config;
    }
    // Return empty config when collaboration is not ready
    // Editor will be created but without collaboration
    console.log('[BlockNote Collab] Editor config WITHOUT collaboration (waiting)');
    return {};
  }, [shouldCreateCollabEditor, provider, fragment, userId, document?.id, hasError]);

  // Create editor - use a key that changes when collaboration becomes available
  // This forces useCreateBlockNote to create a new editor instance with collaboration
  const editorConfigAny = editorConfig as any;
  const hasCollabConfig = !!editorConfigAny.collaboration;
  
  // Create a stable key that only changes when collaboration status actually changes
  // This will force the component to remount and recreate the editor only when needed
  const [editorInstanceKey, setEditorInstanceKey] = useState(`waiting-${document?.id}`);
  
  // Store setEditorInstanceKey in ref so EditorWrapper can access it
  useEffect(() => {
    setEditorInstanceKeyRef.current = setEditorInstanceKey;
  }, []);
  
  useEffect(() => {
    // Only update key when collaboration status actually changes
    if (shouldCreateCollabEditor && hasCollabConfig) {
      setEditorInstanceKey(`collab-ready-${document?.id}`);
    } else {
      setEditorInstanceKey(`waiting-${document?.id}`);
    }
  }, [shouldCreateCollabEditor, hasCollabConfig, document?.id]);
  
  // Create editor with current config
  // IMPORTANT: useCreateBlockNote doesn't recreate editor when config changes
  // So we need to use a wrapper component with key to force recreation
  // For now, create editor with current config - it will be recreated when key changes
  const editor = useCreateBlockNote(editorConfig);

  // Log collaboration config when editor is created
  useEffect(() => {
    if (editor && collaborationEnabled) {
      const editorAny = editor as any;
      console.log('[BlockNote Collab] Collaboration config:');
      console.log('  - hasProvider:', !!editorAny.collaboration?.provider);
      console.log('  - providerType:', editorAny.collaboration?.provider?.constructor?.name);
      console.log('  - hasFragment:', !!editorAny.collaboration?.fragment);
      console.log('  - fragmentName:', editorAny.collaboration?.fragment?.constructor?.name);
      console.log('  - user:', JSON.stringify(editorAny.collaboration?.user));
      console.log('  - hasCollaborationClient:', !!editorAny.collaborationClient);
    }
  }, [editor, collaborationEnabled]);

  // Log when editor is created with collaboration
  useEffect(() => {
    if (editor) {
      const editorAny = editor as any;
      const hasCollab = !!editorAny.collaboration || !!editorAny.collaborationClient;
      console.log('[BlockNote Collab] Editor created:');
      console.log('  - hasCollaboration:', hasCollab);
      console.log('  - documentId:', document?.id);
      console.log('  - collaborationEnabled:', collaborationEnabled);
      console.log('  - editor.collaboration:', !!editorAny.collaboration);
      console.log('  - editor.collaborationClient:', !!editorAny.collaborationClient);
    }
  }, [editor, document?.id, collaborationEnabled]);

  // Stable onChange handler - use ref to avoid recreating editor
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Simple onChange handler - BlockNote collaboration handles sync automatically
  // Use ref to avoid recreating editor when onChange changes
  const handleEditorChange = useCallback(() => {
    if (editor) {
      const content = editor.document;
      onChangeRef.current(content);
    }
  }, [editor]); // Only depend on editor, not onChange

  // Create a wrapper component that will be recreated when key changes
  // This ensures editor is recreated with collaboration when it becomes available
  // Use ref for onChange to avoid recreating wrapper when onChange changes
  const EditorWrapper = useMemo(() => {
    return function EditorWrapperComponent() {
      // This editor will be created fresh when the wrapper is recreated
      const wrappedEditor = useCreateBlockNote(editorConfig);
      
      // Stable onChange handler for wrapped editor - use ref to avoid recreating
      const wrappedOnChangeRef = useRef(onChange);
      useEffect(() => {
        wrappedOnChangeRef.current = onChange;
      }, [onChange]);
      
      // Track if component is mounted
      const isMountedRef = useRef(true);
      // Track if this is the first change (editor initialization)
      const isFirstChangeRef = useRef(true);
      // Track previous heading text to detect actual changes
      const previousHeadingTextRef = useRef<string | null>(null);
      // Track if we're currently updating heading to prevent concurrent updates
      const isUpdatingHeadingRef = useRef(false);
      
      useEffect(() => {
        isMountedRef.current = true;
        isFirstChangeRef.current = true;
        previousHeadingTextRef.current = null;
        isUpdatingHeadingRef.current = false;
        return () => {
          isMountedRef.current = false;
        };
      }, [document?.id]);
      
      const wrappedHandleChange = useCallback(() => {
        if (!wrappedEditor || !isMountedRef.current) {
          return;
        }
        
        try {
          // Check if editor view is still available
          const editorAny = wrappedEditor as any;
          if (editorAny._tiptapEditor && !editorAny._tiptapEditor.view) {
            console.warn('[BlockNote] Editor view not available, skipping onChange');
            return;
          }
          
          // Don't call onChange if we have errors - prevent data loss
          if (errorCountRef.current > 0 || hasErrorRef.current) {
            console.warn('[BlockNote] Skipping onChange due to errors');
            return;
          }
          
          const content = wrappedEditor.document;
          
          // Validate content before calling onChange
          if (!content || !Array.isArray(content) || content.length === 0) {
            console.warn('[BlockNote] Skipping onChange - empty content detected');
            return;
          }
          
          // Ensure first block is always heading 1
          const firstBlock = content[0];
          const isFirstBlockHeading = firstBlock?.type === 'heading' && (firstBlock as any).props?.level === 1;
          
          if (!isFirstBlockHeading && !isUpdatingHeadingRef.current) {
            // First block is not heading 1, restore it
            // Prevent concurrent updates
            isUpdatingHeadingRef.current = true;
            try {
              // Check if editor view is still available before updating
              const editorAny = wrappedEditor as any;
              if (editorAny._tiptapEditor && !editorAny._tiptapEditor.view) {
                console.warn('[BlockNote] Editor view not available, skipping heading restore');
                isUpdatingHeadingRef.current = false;
                return;
              }
              
              const headingText = extractInlineText((firstBlock as any)?.content || '');
              const defaultTitle = documentTitleRef.current || 'Untitled';
              const titleToUse = headingText.trim() || defaultTitle;
              
              // Insert heading 1 before first block
              wrappedEditor.insertBlocks(
                [{ type: 'heading', props: { level: 1 }, content: titleToUse }],
                firstBlock,
                'before'
              );
              // Remove the non-heading first block
              wrappedEditor.removeBlocks([firstBlock]);
              console.log('[BlockNote] Restored heading 1 as first block');
              
              // Reset flag after a delay to allow transaction to complete
              setTimeout(() => {
                isUpdatingHeadingRef.current = false;
              }, 100);
            } catch (error) {
              console.warn('[BlockNote] Error restoring heading 1:', error);
              isUpdatingHeadingRef.current = false;
              
              // If it's a mismatched transaction error, don't retry
              if (error instanceof Error && error.message?.includes('mismatched transaction')) {
                console.warn('[BlockNote] Mismatched transaction error, skipping heading restore');
              }
            }
            return; // Don't call onChange yet, wait for next change
          }
          
          // Extract heading text
          const headingText = extractInlineText((firstBlock as any).content);
          
          // Skip empty check on first change (editor initialization)
          // Only check if heading becomes empty after user interaction
          if (isFirstChangeRef.current) {
            // Store initial heading text
            previousHeadingTextRef.current = headingText;
            isFirstChangeRef.current = false;
            // Call onChange for first change
            if (isMountedRef.current) {
              wrappedOnChangeRef.current(content);
            }
            return;
          }
          
          // Only restore if heading was not empty before but is empty now (user deleted content)
          const wasNotEmpty = previousHeadingTextRef.current && previousHeadingTextRef.current.trim().length > 0;
          const isNowEmpty = !headingText.trim();
          
          if (wasNotEmpty && isNowEmpty && documentTitleRef.current && !isUpdatingHeadingRef.current) {
            // User deleted heading content, restore to document title
            // Prevent concurrent updates
            isUpdatingHeadingRef.current = true;
            try {
              // Check if editor view is still available before updating
              const editorAny = wrappedEditor as any;
              if (editorAny._tiptapEditor && !editorAny._tiptapEditor.view) {
                console.warn('[BlockNote] Editor view not available, skipping heading restore');
                isUpdatingHeadingRef.current = false;
                return;
              }
              
              wrappedEditor.updateBlock(firstBlock, {
                type: 'heading',
                props: { level: 1 },
                content: documentTitleRef.current,
              });
              console.log('[BlockNote] Restored empty heading to document title');
              previousHeadingTextRef.current = documentTitleRef.current;
              
              // Reset flag after a delay to allow transaction to complete
              setTimeout(() => {
                isUpdatingHeadingRef.current = false;
              }, 100);
            } catch (error) {
              console.warn('[BlockNote] Error restoring heading title:', error);
              isUpdatingHeadingRef.current = false;
              
              // If it's a mismatched transaction error, don't retry
              if (error instanceof Error && error.message?.includes('mismatched transaction')) {
                console.warn('[BlockNote] Mismatched transaction error, skipping heading restore');
              }
            }
            return; // Don't call onChange yet, wait for next change
          }
          
          // Update previous heading text
          previousHeadingTextRef.current = headingText;
          
          // Only call onChange if component is still mounted
          if (isMountedRef.current) {
            wrappedOnChangeRef.current(content);
          }
        } catch (error) {
          // Ignore errors if editor is unmounted
          if (isMountedRef.current) {
            console.error('[BlockNote] Error in onChange handler:', error);
          }
          // Don't propagate error to avoid breaking editor
        }
      }, [wrappedEditor, document?.id]); // Remove document.title to prevent re-render
      
      // Ensure heading 1 exists when collaboration is enabled
      useEffect(() => {
        if (!wrappedEditor || !collaborationEnabled || !document?.id || !documentTitleRef.current || !fragmentSynced) {
          return;
        }
        
        // Only run once per document
        if (headingEnsuredRef.current.has(document.id)) {
          return;
        }
        
        // Use setTimeout to ensure editor is fully initialized and Yjs sync is complete
        const timeout = setTimeout(() => {
          // Check if component is still mounted and editor view is available
          if (!isMountedRef.current) {
            return;
          }
          
          try {
            // Check if editor view is still available before updating
            const editorAny = wrappedEditor as any;
            if (editorAny._tiptapEditor && !editorAny._tiptapEditor.view) {
              console.warn('[BlockNote] Editor view not available, skipping heading ensure');
              return;
            }
            
            const content = wrappedEditor.document;
            
            // Check if document is empty or doesn't start with heading 1
            if (!content || content.length === 0) {
              // Document is empty, insert heading 1 using BlockNote API
              try {
                // Try different content formats that BlockNote might accept
                const titleText = documentTitleRef.current || 'Untitled';
                wrappedEditor.insertBlocks(
                  [{ 
                    type: 'heading', 
                    props: { level: 1 }, 
                    content: titleText // BlockNote should accept string for simple text
                  }],
                  wrappedEditor.document[0] || undefined,
                  'before'
                );
                console.log('[BlockNote] Set initial heading 1 for empty document');
                headingEnsuredRef.current.add(document.id);
              } catch (error) {
                console.warn('[BlockNote] Error inserting heading, skipping to avoid breaking editor:', error);
                // Skip heading insertion to prevent breaking the editor
                // The document will work without heading 1, user can add it manually
              }
            } else {
              const firstBlock = content[0];
              // Check if first block is not a heading or not level 1
              if (firstBlock.type !== 'heading' || (firstBlock as any).props?.level !== 1) {
                // Insert heading 1 before first block, then remove first block
                try {
                  const titleText = documentTitleRef.current || 'Untitled';
                  wrappedEditor.insertBlocks(
                    [{ type: 'heading', props: { level: 1 }, content: titleText }],
                    firstBlock,
                    'before'
                  );
                  wrappedEditor.removeBlocks([firstBlock]);
                  console.log('[BlockNote] Ensured heading 1 as first block');
                  headingEnsuredRef.current.add(document.id);
                } catch (error) {
                  console.warn('[BlockNote] Error ensuring heading 1:', error);
                }
              } else {
                // First block is heading 1, but check if it's empty
                const headingText = extractInlineText((firstBlock as any).content);
                
                if (!headingText.trim() && documentTitleRef.current && !isUpdatingHeadingRef.current) {
                  // Heading is empty, update it with document title using BlockNote API
                  // Prevent concurrent updates
                  isUpdatingHeadingRef.current = true;
                  try {
                    // Check if editor view is still available before updating
                    if (editorAny._tiptapEditor && !editorAny._tiptapEditor.view) {
                      console.warn('[BlockNote] Editor view not available, skipping heading fill');
                      isUpdatingHeadingRef.current = false;
                      return;
                    }
                    
                    // Try updateBlock with string content
                    wrappedEditor.updateBlock(firstBlock, {
                      type: 'heading',
                      props: { level: 1 },
                      content: documentTitleRef.current,
                    });
                    console.log('[BlockNote] Filled empty heading with document title');
                    
                    // Reset flag after a delay to allow transaction to complete
                    setTimeout(() => {
                      isUpdatingHeadingRef.current = false;
                    }, 100);
                  } catch (error) {
                    console.warn('[BlockNote] Error updating heading, skipping to avoid breaking editor:', error);
                    isUpdatingHeadingRef.current = false;
                    
                    // If it's a mismatched transaction error, don't retry
                    if (error instanceof Error && error.message?.includes('mismatched transaction')) {
                      console.warn('[BlockNote] Mismatched transaction error, skipping heading fill');
                    }
                  }
                }
                headingEnsuredRef.current.add(document.id);
              }
            }
          } catch (error) {
            console.warn('[BlockNote] Error ensuring heading 1:', error);
          }
        }, 500); // Delay to ensure Yjs sync is complete
        
        return () => clearTimeout(timeout);
      }, [wrappedEditor, collaborationEnabled, document?.id, fragmentSynced]); // Remove document.title to prevent re-render
      
      // Prevent deletion of heading 1 block and sync title
      useEffect(() => {
        if (!wrappedEditor || !document?.id) {
          return;
        }
        
        // Listen for block changes to prevent heading deletion
        const handleBlockChange = () => {
          try {
            const content = wrappedEditor.document;
            
            // Check if first block is heading 1
            const firstBlock = content[0];
            const isFirstBlockHeading = firstBlock?.type === 'heading' && (firstBlock as any).props?.level === 1;
            
            if (!isFirstBlockHeading && content.length > 0) {
              // First block is not heading 1, restore it
              const defaultTitle = documentTitleRef.current || 'Untitled';
              
              // Use setTimeout to avoid conflicts with onChange
              setTimeout(() => {
                try {
                  wrappedEditor.insertBlocks(
                    [{ type: 'heading', props: { level: 1 }, content: defaultTitle }],
                    firstBlock,
                    'before'
                  );
                  wrappedEditor.removeBlocks([firstBlock]);
                  console.log('[BlockNote] Prevented heading deletion, restored heading 1');
                } catch (error) {
                  console.warn('[BlockNote] Error preventing heading deletion:', error);
                }
              }, 0);
            } else if (content.length === 0) {
              // Document is empty, restore heading 1
              setTimeout(() => {
                try {
                  const defaultTitle = documentTitleRef.current || 'Untitled';
                  wrappedEditor.insertBlocks(
                    [{ type: 'heading', props: { level: 1 }, content: defaultTitle }],
                    undefined,
                    'before'
                  );
                  console.log('[BlockNote] Restored heading 1 for empty document');
                } catch (error) {
                  console.warn('[BlockNote] Error restoring heading for empty document:', error);
                }
              }, 0);
            }
          } catch (error) {
            console.warn('[BlockNote] Error in block change handler:', error);
          }
        };
        
        // Listen for block changes via editor's internal events
        const editorAny = wrappedEditor as any;
        if (editorAny._tiptapEditor) {
          const tiptapEditor = editorAny._tiptapEditor;
          
          // Create handler function that we can remove later
          const updateHandler = () => {
            handleBlockChange();
          };
          
          // Listen for transaction updates
          tiptapEditor.on('update', updateHandler);
          
          return () => {
            // Remove listener using off() method
            try {
              if (tiptapEditor && typeof tiptapEditor.off === 'function') {
                tiptapEditor.off('update', updateHandler);
              }
            } catch (error) {
              console.warn('[BlockNote] Error removing editor update listener:', error);
            }
          };
        }
      }, [wrappedEditor, document?.id]); // Remove document.title to prevent re-render
      
      // Catch Yjs/Prosemirror errors to prevent corruption from spreading
      useEffect(() => {
        const handleError = (error: Error) => {
          console.error('[BlockNote] Caught Yjs/Prosemirror error:', error);
          errorCountRef.current += 1;
          
          // CRITICAL: Disable collaboration immediately on first error to prevent data loss
          // Don't wait for 3 errors - one error can corrupt the document
          if (errorCountRef.current >= 1) {
            console.warn('[BlockNote] Yjs error detected, disabling collaboration immediately to prevent data loss');
            if (setHasErrorRef.current) {
              setHasErrorRef.current(true);
            }
            // Force editor recreation by changing key to disable collaboration
            if (setEditorInstanceKeyRef.current) {
              setEditorInstanceKeyRef.current(`error-${document?.id}-${Date.now()}`);
            }
          }
        };
        
        // Listen for errors on the editor
        const editorAny = wrappedEditor as any;
        if (editorAny?.collaborationClient) {
          // BlockNote collaboration client might have error handlers
          const originalErrorHandler = editorAny.collaborationClient.onError;
          if (originalErrorHandler) {
            editorAny.collaborationClient.onError = (error: Error) => {
              handleError(error);
              if (originalErrorHandler) {
                originalErrorHandler(error);
              }
            };
          }
        }
        
        // Also catch global errors from Yjs
        const errorListener = (event: ErrorEvent) => {
          if (event.message?.includes('Position') && event.message?.includes('out of range')) {
            handleError(new Error(event.message));
          }
        };
        
        window.addEventListener('error', errorListener);
        
        return () => {
          window.removeEventListener('error', errorListener);
        };
      }, [wrappedEditor, document?.id]);
      
      return (
        <BlockNoteView
          editor={wrappedEditor}
          onChange={wrappedHandleChange}
          theme={isDark ? "dark" : "light"}
          className="rounded-lg border border-border/50 shadow-sm"
          slashMenu={false}
          editable={canEditWorkspace}
        >
          {canEditWorkspace && (
            <CustomSlashMenu
              editor={wrappedEditor}
              docId={document.id}
              docTitle={documentTitleRef.current}
              onTaskClick={onTaskClick}
            />
          )}
        </BlockNoteView>
      );
    };
  }, [editorConfig, isDark, canEditWorkspace, document.id, onTaskClick, hasError]); // Remove document.title to prevent re-render

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <EditorWrapper key={editorInstanceKey} />
    </div>
  );
}