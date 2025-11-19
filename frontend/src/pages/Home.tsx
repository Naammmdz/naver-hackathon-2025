import { useBoardStore } from '@/store/boardStore';
import { useDocumentStore } from '@/store/documentStore';
import { useTaskStore } from '@/store/taskStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { DashboardCard, DashboardCardConfig } from '@/components/dashboard/DashboardCard';
import { CardCustomizationDialog } from '@/components/dashboard/CardCustomizationDialog';
import { CardGallery, CardTemplate } from '@/components/dashboard/CardGallery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckSquare, FileText, Layers, TrendingUp, Users, Plus, Settings2, RotateCcw, MessageSquare, Sparkles, BarChart3, Calendar, Clock, Link2, ExternalLink, ChevronLeft, ChevronRight, Target, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCachedBoardPreview } from '@/utils/boardPreview';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, format, addMonths, subMonths, isSameMonth } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { QuickTodoList } from "@/components/dashboard/QuickTodoList";
import { findOverlappingCards, adjustOverlappingCards, getCardBounds, gridUnitsToPixels } from "@/utils/cardLayout";
import { getAvatarColor, getInitials } from '@/utils/avatarColors';

export default function Home({ onViewChange }: { onViewChange: (view: 'tasks' | 'docs' | 'board' | 'home' | 'teams') => void }) {
  const { t } = useTranslation();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const members = useWorkspaceStore((state) => state.members);

  const tasks = useTaskStore((state) => state.tasks);
  const documents = useDocumentStore((state) => state.documents);
  const boards = useBoardStore((state) => state.boards);

  const { cards, removeCard, updateCard, reorderCards, resetToDefault, addCard } = useDashboardStore();
  const [editingCard, setEditingCard] = useState<DashboardCardConfig | null>(null);
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [showCardGallery, setShowCardGallery] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [isDark, setIsDark] = useState(false);
  
  // Embed link state
  const [embedUrl, setEmbedUrl] = useState('');

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);
      setIsDark(shouldBeDark);
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Filter by active workspace
  const workspaceTasks = activeWorkspaceId
    ? tasks.filter((t) => t.workspaceId === activeWorkspaceId)
    : tasks.filter((t) => !t.workspaceId);
  const workspaceDocuments = activeWorkspaceId
    ? documents.filter((d) => d.workspaceId === activeWorkspaceId && !d.trashed)
    : documents.filter((d) => !d.workspaceId && !d.trashed);
  const workspaceBoards = activeWorkspaceId
    ? boards.filter((b) => b.workspaceId === activeWorkspaceId)
    : boards.filter((b) => !b.workspaceId);

  // Statistics
  const todoTasks = workspaceTasks.filter((t) => t.status === 'Todo').length;
  const inProgressTasks = workspaceTasks.filter((t) => t.status === 'In Progress').length;
  const doneTasks = workspaceTasks.filter((t) => t.status === 'Done').length;
  const recentDocuments = workspaceDocuments
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);
  const recentBoards = workspaceBoards
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);
  const recentTasks = workspaceTasks
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  // Drag and drop - Optimized for performance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced from 8px for faster activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex((card) => card.id === active.id);
      const newIndex = cards.findIndex((card) => card.id === over.id);
      const newCards = arrayMove(cards, oldIndex, newIndex);
      
      // Recalculate positions to avoid overlap
      const updatedCards = newCards.map((card, index) => {
        // Reset x, y to let grid auto-place
        const { x, y, ...rest } = card;
        return { ...rest, order: index };
      });
      
      reorderCards(updatedCards);
    }
  };

  const handleEditCard = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (card) {
      setEditingCard(card);
      setShowCustomizationDialog(true);
    }
  };

  const handleSaveCard = (card: DashboardCardConfig) => {
    updateCard(card.id, card);
    setEditingCard(null);
  };

  const handleSelectCardTemplate = (template: CardTemplate) => {
    const newCard: DashboardCardConfig = {
      id: template.id + '-' + Date.now(),
      type: template.category === 'ai' ? 'custom' : 'stat',
      title: template.name,
      description: template.description,
      size: template.size,
      visible: true,
      order: cards.length,
      color: template.color,
    };
    addCard(newCard);
  };

  const visibleCards = cards.filter((card) => card.visible).sort((a, b) => a.order - b.order);

  // Card content renderers
  const renderCardContent = (card: DashboardCardConfig) => {
    // Get base card ID (remove timestamp suffix if added from gallery)
    const baseCardId = card.id.includes('-') && !isNaN(Number(card.id.split('-').pop())) 
      ? card.id.substring(0, card.id.lastIndexOf('-'))
      : card.id;
    
    switch (baseCardId) {
      case 'tasks-overview':
        // Get latest tasks for preview
        const latestTasks = workspaceTasks
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, 3);

        return (
          <div className="space-y-2 h-full flex flex-col">
            {/* Stats Header - Compact */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold">{workspaceTasks.length}</p>
                <p className="text-[10px] text-muted-foreground">{t('dashboard.totalTasks', 'Total Tasks')}</p>
              </div>
            </div>

            {/* Status Breakdown - Compact */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-md bg-muted/60 border border-border/40 p-1.5 text-center hover:bg-muted/80 hover:border-border/60 hover:shadow-sm transition-all cursor-pointer">
                <p className="text-sm font-semibold">{todoTasks}</p>
                <p className="text-[9px] text-muted-foreground">{t('tasks.status.todo', 'Todo')}</p>
              </div>
              <div className="rounded-md bg-primary/10 border border-primary/20 p-1.5 text-center hover:bg-primary/15 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                <p className="text-sm font-semibold text-primary">{inProgressTasks}</p>
                <p className="text-[9px] text-muted-foreground">{t('tasks.status.inProgress', 'In Progress')}</p>
              </div>
              <div className="rounded-md bg-success/10 border border-success/20 p-1.5 text-center hover:bg-success/15 hover:border-success/30 hover:shadow-sm transition-all cursor-pointer">
                <p className="text-sm font-semibold text-success">{doneTasks}</p>
                <p className="text-[9px] text-muted-foreground">{t('tasks.status.done', 'Done')}</p>
              </div>
            </div>

            {/* Latest Tasks Preview - Compact */}
            {latestTasks.length > 0 && (
              <div className="space-y-1 flex-1 overflow-hidden">
                <p className="text-[10px] font-medium text-muted-foreground">Recent</p>
                <div className="space-y-0.5">
                  {latestTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-accent border border-transparent hover:border-border/40 hover:shadow-sm transition-all text-[11px] cursor-pointer"
                    >
                      <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
                        task.status === 'Done' ? 'bg-success' :
                        task.status === 'In Progress' ? 'bg-primary' :
                        'bg-muted-foreground'
                      }`} />
                      <span className="flex-1 truncate">{task.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange('tasks')}
              className="w-full text-[11px] h-7 mt-auto"
            >
              {t('dashboard.viewAllTasks', 'View All')} →
            </Button>
          </div>
        );

      case 'documents-stat':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{workspaceDocuments.length}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.totalDocuments', 'Total Documents')}</p>
              </div>
              <div className="rounded-full bg-secondary/10 p-3">
                <FileText className="h-6 w-6 text-secondary" />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewChange('docs')}
              className="w-full"
            >
              {t('dashboard.viewAllDocs', 'View All Documents')} →
            </Button>
          </div>
        );

      case 'boards-stat':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{workspaceBoards.length}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.totalBoards', 'Total Boards')}</p>
              </div>
              <div className="rounded-full bg-accent/10 p-3">
                <Layers className="h-6 w-6 text-accent" />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewChange('board')}
              className="w-full"
            >
              {t('dashboard.viewAllBoards', 'View All Boards')} →
            </Button>
          </div>
        );

      case 'team-stat':
        return (
          <div className="space-y-3 h-full flex flex-col">
            {/* Header Stats */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{members.length}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.teamMembers', 'Team Members')}</p>
              </div>
              <div className="rounded-full bg-success/10 p-3">
                <Users className="h-6 w-6 text-success" />
              </div>
            </div>

            {/* Members List */}
            {members.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t('dashboard.noMembers', 'No members yet')}
              </p>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/80 border border-transparent hover:border-border/40 hover:shadow-sm transition-all cursor-pointer"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {member.user?.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt={member.user?.fullName || member.user?.email || member.userId}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`h-8 w-8 rounded-full ${getAvatarColor(member.userId).bg} flex items-center justify-center`}>
                          <span className={`text-xs font-medium ${getAvatarColor(member.userId).text}`}>
                            {getInitials(member.user?.fullName, member.userId)}
                          </span>
                        </div>
                      )}
                      {/* Role badge */}
                      {member.role === 'OWNER' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-warning border border-background flex items-center justify-center">
                          <span className="text-[6px] text-background font-bold">★</span>
                        </div>
                      )}
                      {member.role === 'ADMIN' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border border-background" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {member.user?.fullName || member.user?.email || 'Unknown'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {member.role === 'OWNER' ? '👑 Owner' : 
                         member.role === 'ADMIN' ? '⚡ Admin' : 
                         '👤 Member'}
                      </p>
                    </div>
                  </div>
                ))}

                {members.length > 5 && (
                  <div className="text-center pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onViewChange('teams')}
                    >
                      +{members.length - 5} more
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* View All Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewChange('teams')}
              className="w-full mt-auto"
            >
              {t('dashboard.viewAllMembers', 'View All Members')} →
            </Button>
          </div>
        );

      case 'recent-documents':
        return (
          <div className="space-y-1.5 h-full flex flex-col">
            {recentDocuments.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">
                {t('dashboard.noDocuments', 'No documents yet')}
              </p>
            ) : (
              <div className="space-y-1.5 flex-1 overflow-y-auto">
                {recentDocuments.map((doc) => {
                  // Extract preview text from BlockNote content
                  const getPreviewText = (content: any[]): string => {
                    try {
                      if (!content || content.length === 0) return 'Empty document';
                      
                      // Try to extract text from more blocks for better preview
                      let text = '';
                      for (let i = 0; i < Math.min(6, content.length); i++) {
                        const block = content[i];
                        if (block?.content) {
                          if (Array.isArray(block.content)) {
                            const blockText = block.content
                              .map((item: any) => item.text || '')
                              .join('')
                              .trim();
                            if (blockText) {
                              text += blockText + ' ';
                            }
                          } else if (typeof block.content === 'string') {
                            text += block.content + ' ';
                          }
                        } else if (block?.text) {
                          text += block.text + ' ';
                        } else if (typeof block === 'string') {
                          text += block + ' ';
                        }
                        
                        // Stop if we have enough text (around 200 chars)
                        if (text.length > 200) break;
                      }
                      
                      return text.trim() || 'Empty document';
                    } catch (error) {
                      console.error('Error extracting preview text:', error);
                      return 'Empty document';
                    }
                  };

                  const previewText = getPreviewText(doc.content);
                  
                  // Get more text for hover preview (up to 500 chars)
                  const getFullPreviewText = (content: any[]): string => {
                    try {
                      if (!content || content.length === 0) return 'Empty document';
                      
                      let text = '';
                      for (let i = 0; i < content.length; i++) {
                        const block = content[i];
                        if (block?.content) {
                          if (Array.isArray(block.content)) {
                            const blockText = block.content
                              .map((item: any) => item.text || '')
                              .join('')
                              .trim();
                            if (blockText) {
                              text += blockText + '\n\n';
                            }
                          } else if (typeof block.content === 'string') {
                            text += block.content + '\n\n';
                          }
                        } else if (block?.text) {
                          text += block.text + '\n\n';
                        } else if (typeof block === 'string') {
                          text += block + '\n\n';
                        }
                        
                        if (text.length > 500) break;
                      }
                      
                      return text.trim() || 'Empty document';
                    } catch (error) {
                      return 'Empty document';
                    }
                  };
                  
                  const fullPreviewText = getFullPreviewText(doc.content);

                  return (
                    <HoverCard key={doc.id} openDelay={300}>
                      <HoverCardTrigger asChild>
                        <button
                          onClick={() => {
                            useDocumentStore.getState().setActiveDocument(doc.id);
                            onViewChange('docs');
                          }}
                          className="w-full text-left rounded border hover:border-primary/50 hover:bg-accent/50 transition-all group overflow-hidden"
                        >
                          {/* Preview Section - Compact */}
                          <div className="p-2 space-y-1">
                            <p className="text-[11px] font-semibold truncate group-hover:text-primary transition-colors">
                              {doc.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed">
                              {previewText}
                            </p>
                            <div className="text-[9px] text-muted-foreground/60">
                              {new Date(doc.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent 
                        side="right" 
                        align="start" 
                        className="w-96 p-4"
                        sideOffset={10}
                      >
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-semibold leading-tight">{doc.title}</h4>
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          {/* Divider */}
                          <div className="border-t" />
                          
                          {/* Full Preview */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Preview</p>
                            <div className="max-h-64 overflow-y-auto rounded-md bg-muted/30 p-3">
                              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                {fullPreviewText}
                              </p>
                            </div>
                          </div>
                          
                          {/* Footer */}
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground italic">
                              Click to open document
                            </p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'recent-boards':
        return (
          <div className="space-y-1.5 h-full flex flex-col">
            {recentBoards.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">
                {t('dashboard.noBoards', 'No boards yet')}
              </p>
            ) : (
              <div className="space-y-1.5 flex-1 overflow-y-auto">
                {recentBoards.map((board) => {
                  // Get shape count and types from board snapshot
                  const getBoardInfo = (snapshot: any): { count: number; types: string[] } => {
                    try {
                      if (!snapshot) return { count: 0, types: [] };
                      // Handle both Yjs format and standard format
                      if (snapshot.store) {
                        const store = snapshot.store;
                        const shapes = Object.values(store).filter((item: any) => 
                          item?.typeName === 'shape'
                        );
                        const types = shapes.map((shape: any) => shape.type).slice(0, 5);
                        return { count: shapes.length, types };
                      } else if (snapshot.elements) {
                        const elements = snapshot.elements || [];
                        const types = elements.map((el: any) => el.type).slice(0, 5);
                        return { count: elements.length, types };
                      }
                      return { count: 0, types: [] };
                    } catch (error) {
                      return { count: 0, types: [] };
                    }
                  };

                  const boardInfo = getBoardInfo(board.snapshot);
                  
                  // Board preview component with state
                  const BoardPreviewCard = () => {
                    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
                    const [isLoading, setIsLoading] = useState(true);

                    useEffect(() => {
                      let cancelled = false;
                      setIsLoading(true);
                      
                      console.log('[BoardPreviewCard] Generating preview for board', board.id, { 
                        hasSnapshot: !!board.snapshot,
                        snapshotType: board.snapshot ? ((board.snapshot as any).store ? 'yjs' : 'standard') : 'null'
                      });
                      
                      getCachedBoardPreview(board.id, board.snapshot)
                        .then((url) => {
                          if (!cancelled) {
                            console.log('[BoardPreviewCard] Preview URL received', board.id, { 
                              hasUrl: !!url,
                              urlLength: url?.length || 0,
                              urlPreview: url ? url.substring(0, 50) + '...' : 'null'
                            });
                            setPreviewUrl(url);
                            setIsLoading(false);
                          }
                        })
                        .catch((error) => {
                          console.error('[BoardPreviewCard] Error generating preview', board.id, error);
                          if (!cancelled) {
                            setPreviewUrl(null);
                            setIsLoading(false);
                          }
                        });

                      return () => {
                        cancelled = true;
                      };
                    }, [board.id, board.snapshot]);

                    return (
                      <HoverCard key={board.id} openDelay={300}>
                        <HoverCardTrigger asChild>
                          <button
                            onClick={() => {
                              useBoardStore.getState().setActiveBoard(board.id);
                              onViewChange('board');
                            }}
                            className="w-full text-left rounded border hover:border-primary/50 hover:bg-accent/50 transition-all group overflow-hidden"
                          >
                            {/* Preview Section - Compact (similar to docs cards) */}
                            <div className="p-2 space-y-1">
                              <p className="text-[11px] font-semibold truncate group-hover:text-primary transition-colors">
                                {board.title}
                              </p>
                              {/* Preview Image - Larger */}
                              <div className="relative h-32 rounded border overflow-hidden bg-gradient-to-br from-accent/5 to-primary/5">
                                {isLoading ? (
                                  // Loading state
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Layers className="h-8 w-8 text-accent opacity-30 animate-pulse" />
                                  </div>
                                ) : previewUrl ? (
                                  // Actual preview image - larger version
                                  <img
                                    src={previewUrl}
                                    alt={board.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error('[BoardPreviewCard] Image load error', board.id);
                                      // Hide image on error, show fallback
                                      e.currentTarget.style.display = 'none';
                                    }}
                                    onLoad={() => {
                                      console.log('[BoardPreviewCard] Image loaded successfully', board.id);
                                    }}
                                  />
                                ) : (
                                  // Fallback when no preview available
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Layers className="h-8 w-8 text-accent opacity-30" />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />
                                  {boardInfo.count} shapes
                                </span>
                                <span>•</span>
                                <span>Whiteboard</span>
                              </div>
                              <div className="text-[9px] text-muted-foreground/60">
                                {new Date(board.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent 
                          side="right" 
                          align="start" 
                          className="w-[500px] p-4"
                          sideOffset={10}
                        >
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-semibold leading-tight">{board.title}</h4>
                                <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Updated {new Date(board.updatedAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                  {boardInfo.count} shapes
                                </span>
                              </div>
                            </div>
                            
                            {/* Divider */}
                            <div className="border-t" />
                            
                            {/* Full Preview */}
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Preview</p>
                              <div className="rounded-md bg-muted/30 overflow-hidden border">
                                {isLoading ? (
                                  <div className="h-64 flex items-center justify-center">
                                    <Layers className="h-12 w-12 text-muted-foreground opacity-30 animate-pulse" />
                                  </div>
                                ) : previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt={board.title}
                                    className="w-full h-auto object-contain"
                                  />
                                ) : (
                                  <div className="h-64 flex items-center justify-center bg-gradient-to-br from-accent/5 to-primary/5">
                                    <Layers className="h-12 w-12 text-accent opacity-30" />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Footer */}
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground italic">
                                Click to open board
                              </p>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    );
                  };

                  return <BoardPreviewCard key={board.id} />;
                })}
              </div>
            )}
          </div>
        );

      case 'recent-tasks':
        return (
          <div className="space-y-1.5 h-full flex flex-col">
            {recentTasks.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">
                {t('dashboard.noTasks', 'No tasks yet')}
              </p>
            ) : (
              <div className="space-y-1.5 flex-1 overflow-y-auto">
                {recentTasks.map((task) => {
                  // Get preview text from task description
                  const previewText = task.description 
                    ? (task.description.length > 150 
                        ? task.description.substring(0, 150) + '...' 
                        : task.description)
                    : 'No description';

                  // Get status color
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'Done':
                        return 'bg-success';
                      case 'In Progress':
                        return 'bg-primary';
                      default:
                        return 'bg-muted-foreground';
                    }
                  };

                  // Get priority color
                  const getPriorityColor = (priority: string) => {
                    switch (priority) {
                      case 'High':
                        return 'text-destructive';
                      case 'Medium':
                        return 'text-warning';
                      default:
                        return 'text-muted-foreground';
                    }
                  };

                  return (
                    <HoverCard key={task.id} openDelay={300}>
                      <HoverCardTrigger asChild>
                        <button
                          onClick={() => {
                            onViewChange('tasks');
                          }}
                          className="w-full text-left rounded border hover:border-primary/50 hover:bg-accent/50 transition-all group overflow-hidden"
                        >
                          {/* Preview Section - Compact */}
                          <div className="p-2 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[11px] font-semibold truncate group-hover:text-primary transition-colors flex-1">
                                {task.title}
                              </p>
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${getStatusColor(task.status)}`} />
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed">
                              {previewText}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className={`${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span>•</span>
                              <span>{task.status}</span>
                              {task.dueDate && (
                                <>
                                  <span>•</span>
                                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                            <div className="text-[9px] text-muted-foreground/60">
                              {new Date(task.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent 
                        side="right" 
                        align="start" 
                        className="w-96 p-4"
                        sideOffset={10}
                      >
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-semibold leading-tight">{task.title}</h4>
                              <CheckSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Updated {new Date(task.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          {/* Divider */}
                          <div className="border-t" />
                          
                          {/* Task Details */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Status:</span>
                                <span className="font-medium">{task.status}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Priority:</span>
                                <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                            {task.dueDate && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Due:</span>
                                <span className="ml-1 font-medium">
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {task.description && (
                              <>
                                <div className="border-t" />
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">Description</p>
                                  <div className="max-h-64 overflow-y-auto rounded-md bg-muted/30 p-3">
                                    <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                      {task.description}
                                    </p>
                                  </div>
                                </div>
                              </>
                            )}
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {task.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Footer */}
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground italic">
                              Click to open task
                            </p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'task-analytics':
        // Calculate analytics data
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date;
        });

        const completionByDay = last7Days.map(date => {
          const dayTasks = workspaceTasks.filter(task => {
            const taskDate = new Date(task.updatedAt);
            return taskDate.toDateString() === date.toDateString() && task.status === 'Done';
          });
          return {
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            completed: dayTasks.length,
          };
        });

        const priorityBreakdown = {
          high: workspaceTasks.filter(t => t.priority === 'High').length,
          medium: workspaceTasks.filter(t => t.priority === 'Medium').length,
          low: workspaceTasks.filter(t => t.priority === 'Low').length,
        };

        const statusBreakdown = {
          todo: todoTasks,
          inProgress: inProgressTasks,
          done: doneTasks,
        };

        const completionRate = workspaceTasks.length > 0 
          ? Math.round((doneTasks / workspaceTasks.length) * 100) 
          : 0;

        const maxCompleted = Math.max(...completionByDay.map(d => d.completed), 1);

        return (
          <div className="space-y-4 h-full flex flex-col overflow-y-auto">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Completion Rate */}
              <div className="rounded-lg border border-border/60 bg-gradient-to-br from-chart-2/5 via-background to-background p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-medium text-muted-foreground">Completion</p>
                  <BarChart3 className="h-4 w-4 text-[hsl(var(--chart-2))]" />
                </div>
                <p className="text-2xl font-bold">{completionRate}%</p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  {doneTasks} of {workspaceTasks.length} tasks
                </p>
              </div>

              {/* Total Tasks */}
              <div className="rounded-lg border border-border/60 bg-gradient-to-br from-primary/5 via-background to-background p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground">Total Tasks</p>
                  <CheckSquare className="h-4 w-4 text-[hsl(var(--primary))]" />
                </div>
                <p className="text-2xl font-bold">{workspaceTasks.length}</p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  In workspace
                </p>
              </div>
            </div>

            {/* Status Breakdown */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Status Breakdown</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <span className="text-[11px] text-muted-foreground">Todo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{statusBreakdown.todo}</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gray-500 rounded-full"
                        style={{ width: `${workspaceTasks.length > 0 ? (statusBreakdown.todo / workspaceTasks.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-2))]" />
                    <span className="text-[11px] text-muted-foreground">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{statusBreakdown.inProgress}</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[hsl(var(--chart-2))] rounded-full"
                        style={{ width: `${workspaceTasks.length > 0 ? (statusBreakdown.inProgress / workspaceTasks.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-3))]" />
                    <span className="text-[11px] text-muted-foreground">Done</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{statusBreakdown.done}</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[hsl(var(--chart-3))] rounded-full"
                        style={{ width: `${workspaceTasks.length > 0 ? (statusBreakdown.done / workspaceTasks.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 7-Day Completion Trend */}
            <div className="flex-1 min-h-0">
              <p className="text-xs font-semibold text-foreground mb-3">7-Day Completion Trend</p>
              <div className="flex items-end justify-between gap-1.5 h-32">
                {completionByDay.map((day, idx) => {
                  const height = maxCompleted > 0 ? (day.completed / maxCompleted) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                      <div className="w-full h-full bg-muted rounded-t relative flex items-end" style={{ minHeight: '80px' }}>
                        <div 
                          className="w-full bg-[hsl(var(--chart-3))] rounded-t transition-all hover:opacity-80"
                          style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                          title={`${day.completed} tasks completed`}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground font-medium">{day.day}</span>
                      <span className="text-[10px] font-bold text-foreground">{day.completed}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority Breakdown */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">By Priority</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-[hsl(var(--priority-high))]/5 border-[hsl(var(--priority-high))]/20 p-2.5 text-center">
                  <p className="text-lg font-bold text-[hsl(var(--priority-high))]">{priorityBreakdown.high}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">High</p>
                </div>
                <div className="rounded-lg border bg-[hsl(var(--priority-medium))]/5 border-[hsl(var(--priority-medium))]/20 p-2.5 text-center">
                  <p className="text-lg font-bold text-[hsl(var(--priority-medium))]">{priorityBreakdown.medium}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Medium</p>
                </div>
                <div className="rounded-lg border bg-[hsl(var(--priority-low))]/5 border-[hsl(var(--priority-low))]/20 p-2.5 text-center">
                  <p className="text-lg font-bold text-[hsl(var(--priority-low))]">{priorityBreakdown.low}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Low</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'completion-rate':
        const completionRateValue = workspaceTasks.length > 0 
          ? Math.round((doneTasks / workspaceTasks.length) * 100) 
          : 0;

        return (
          <div className="h-full flex flex-col items-center justify-center space-y-4 p-4">
            {/* Circular Progress */}
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - completionRateValue / 100)}`}
                  strokeLinecap="round"
                  className="text-[hsl(var(--chart-3))] transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold">{completionRateValue}%</p>
                  <p className="text-[10px] text-muted-foreground">Complete</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-semibold">{doneTasks}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{workspaceTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-semibold">{workspaceTasks.length - doneTasks}</span>
              </div>
            </div>
          </div>
        );

      case 'productivity-score':
        // Calculate productivity score
        const tasksCompletedThisWeek = workspaceTasks.filter(task => {
          const taskDate = new Date(task.updatedAt);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return task.status === 'Done' && taskDate >= weekAgo;
        }).length;

        const overdueTasksCount = workspaceTasks.filter(task => {
          if (!task.dueDate || task.status === 'Done') return false;
          return new Date(task.dueDate) < new Date();
        }).length;

        const completionRateForScore = workspaceTasks.length > 0 
          ? (doneTasks / workspaceTasks.length) * 100
          : 0;

        const recentActivityScore = Math.min(tasksCompletedThisWeek * 10, 40);
        const completionScore = Math.min(completionRateForScore * 0.4, 40);
        const overduePenalty = Math.max(0, 20 - (overdueTasksCount * 5));
        const productivityScore = Math.round(recentActivityScore + completionScore + overduePenalty);

        // Get score color
        const getScoreColor = (score: number) => {
          if (score >= 80) return 'text-[hsl(var(--success))]';
          if (score >= 60) return 'text-[hsl(var(--priority-medium))]';
          if (score >= 40) return 'text-[hsl(var(--warning))]';
          return 'text-[hsl(var(--destructive))]';
        };

        const getScoreBgColor = (score: number) => {
          if (score >= 80) return 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/20';
          if (score >= 60) return 'bg-[hsl(var(--priority-medium))]/10 border-[hsl(var(--priority-medium))]/20';
          if (score >= 40) return 'bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/20';
          return 'bg-[hsl(var(--destructive))]/10 border-[hsl(var(--destructive))]/20';
        };

        return (
          <div className="h-full flex flex-col items-center justify-center space-y-4 p-4">
            {/* Score Display */}
            <div className={`rounded-lg border p-6 ${getScoreBgColor(productivityScore)}`}>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Productivity Score</p>
                <p className={`text-5xl font-bold ${getScoreColor(productivityScore)}`}>
                  {productivityScore}
                </p>
                <p className="text-xs text-muted-foreground mt-1">out of 100</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">This Week</span>
                <span className="font-semibold">{tasksCompletedThisWeek} tasks</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Overdue</span>
                <span className={`font-semibold ${overdueTasksCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {overdueTasksCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-semibold">{Math.round(completionRateForScore)}%</span>
              </div>
            </div>
          </div>
        );

      case 'time-tracking':
        // Calculate time metrics
        const tasksWithDueDate = workspaceTasks.filter(t => t.dueDate);
        const completedWithDueDate = tasksWithDueDate.filter(t => t.status === 'Done');
        
        // Estimate time based on task age and completion
        const averageTaskAge = workspaceTasks.length > 0
          ? Math.round(
              workspaceTasks.reduce((sum, task) => {
                const age = new Date().getTime() - new Date(task.createdAt).getTime();
                return sum + (age / (1000 * 60 * 60)); // Convert to hours
              }, 0) / workspaceTasks.length
            )
          : 0;

        const totalEstimatedHours = Math.round(averageTaskAge * workspaceTasks.length / 24);

        return (
          <div className="h-full flex flex-col space-y-4 p-4">
            {/* Time Metrics */}
            <div className="space-y-3">
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground">Avg Task Age</p>
                  <Clock className="h-4 w-4 text-orange-500" />
                </div>
                <p className="text-xl font-bold">{averageTaskAge}h</p>
                <p className="text-[9px] text-muted-foreground">Average hours</p>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground">Total Estimated</p>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-xl font-bold">{totalEstimatedHours}h</p>
                <p className="text-[9px] text-muted-foreground">All tasks</p>
              </div>
            </div>

            {/* Task Status Timeline */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Task Timeline</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">With Due Dates</span>
                  <span className="font-semibold">{tasksWithDueDate.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Completed on Time</span>
                  <span className="font-semibold text-green-500">{completedWithDueDate.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold">{tasksWithDueDate.length - completedWithDueDate.length}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ai-chat':
        // Get recent chat messages from localStorage
        const getRecentChatMessages = () => {
          if (typeof window === 'undefined') return [];
          
          try {
            const stored = localStorage.getItem('global-ai-chat-history');
            if (!stored) return [];
            
            const messages = JSON.parse(stored);
            // Filter out welcome message and get last 3 conversations (user + assistant pairs)
            const filtered = messages.filter((msg: any) => msg.id !== 'assistant-welcome');
            return filtered.slice(-6); // Last 3 conversations (6 messages)
          } catch (error) {
            return [];
          }
        };

        const recentMessages = getRecentChatMessages();

        return (
          <div className="h-full flex flex-col space-y-2 overflow-y-auto">
            {recentMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  No chat history
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Start a conversation with AI Chat
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    // Trigger AI chat panel open
                    const button = document.querySelector('[aria-controls="global-ai-chat-panel"]') as HTMLButtonElement;
                    if (button) button.click();
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open AI Chat
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-2 pb-2 border-b">
                  <p className="text-xs font-semibold text-foreground">Recent Conversations</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      const button = document.querySelector('[aria-controls="global-ai-chat-panel"]') as HTMLButtonElement;
                      if (button) button.click();
                    }}
                  >
                    View All
                  </Button>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {recentMessages.map((message: any) => (
                    <div
                      key={message.id}
                      className={`flex gap-2 text-xs ${
                        message.role === 'assistant' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <Sparkles className="h-3 w-3 text-purple-500 flex-shrink-0 mt-1" />
                      )}
                      <div
                        className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                          message.role === 'assistant'
                            ? 'bg-muted text-foreground'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <p className="leading-relaxed line-clamp-3">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      const button = document.querySelector('[aria-controls="global-ai-chat-panel"]') as HTMLButtonElement;
                      if (button) button.click();
                    }}
                  >
                    <MessageSquare className="h-3 w-3 mr-2" />
                    Continue Chat
                  </Button>
                </div>
              </>
            )}
          </div>
        );

      case 'todo-list':
        return <QuickTodoList />;

      case 'quick-actions':
        return (
          <div className="h-full flex flex-col space-y-2">
            <div className="grid grid-cols-2 gap-2 flex-1">
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center justify-center gap-2 p-4 hover:bg-accent transition-colors"
                onClick={() => onViewChange('tasks')}
              >
                <CheckSquare className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-medium">New Task</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center justify-center gap-2 p-4 hover:bg-accent transition-colors"
                onClick={() => onViewChange('docs')}
              >
                <FileText className="h-5 w-5 text-orange-500" />
                <span className="text-xs font-medium">New Doc</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center justify-center gap-2 p-4 hover:bg-accent transition-colors"
                onClick={() => onViewChange('board')}
              >
                <Layers className="h-5 w-5 text-pink-500" />
                <span className="text-xs font-medium">New Board</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center justify-center gap-2 p-4 hover:bg-accent transition-colors"
                onClick={() => {
                  const button = document.querySelector('[aria-controls="global-ai-chat-panel"]') as HTMLButtonElement;
                  if (button) button.click();
                }}
              >
                <Sparkles className="h-5 w-5 text-purple-500" />
                <span className="text-xs font-medium">AI Chat</span>
              </Button>
            </div>
          </div>
        );

      case 'embed-link':
        // Helper function to detect URL type and generate embed
        const getEmbedContent = (url: string) => {
          if (!url) return null;

          // YouTube
          const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
          if (youtubeMatch) {
            return (
              <iframe
                className="w-full h-full rounded"
                src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            );
          }

          // Google Docs/Sheets/Slides
          if (url.includes('docs.google.com') || url.includes('drive.google.com')) {
            const embedUrl = url.replace('/edit', '/preview');
            return (
              <iframe
                className="w-full h-full rounded"
                src={embedUrl}
              />
            );
          }

          // Figma
          if (url.includes('figma.com')) {
            return (
              <iframe
                className="w-full h-full rounded"
                src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`}
                allowFullScreen
              />
            );
          }

          // Generic iframe for other URLs
          return (
            <iframe
              className="w-full h-full rounded"
              src={url}
              sandbox="allow-scripts allow-same-origin"
            />
          );
        };

        return (
          <div className="h-full flex flex-col space-y-2">
            {/* URL Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="Paste YouTube, Google Docs, Figma, or any URL..."
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  className="pl-8 text-xs"
                />
              </div>
              {embedUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEmbedUrl('')}
                  className="flex-shrink-0"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Embed Preview */}
            <div className="flex-1 min-h-0 rounded border bg-muted/20">
              {embedUrl ? (
                getEmbedContent(embedUrl)
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <ExternalLink className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Embed External Content
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Paste a link to preview YouTube videos, Google Docs, Figma designs, and more
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 'calendar-view':
        // Mini calendar view with tasks
        const monthStart = startOfMonth(calendarDate);
        const monthEnd = endOfMonth(calendarDate);
        const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
        
        const getTasksForDate = (date: Date) => {
          return workspaceTasks.filter(task => 
            task.dueDate && isSameDay(new Date(task.dueDate), date)
          );
        };

        return (
          <div className="h-full flex flex-col space-y-2">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {format(calendarDate, 'MMMM yyyy')}
              </h3>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setCalendarDate(new Date())}
                >
                  <Calendar className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-hidden">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-px mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={idx} className="text-center text-[9px] font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-px">
                {calendarDays.map((day) => {
                  const dayTasks = getTasksForDate(day);
                  const isCurrentMonth = isSameMonth(day, calendarDate);
                  const isTodayDate = isToday(day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={`
                        relative aspect-square rounded text-center p-0.5
                        ${!isCurrentMonth ? 'text-muted-foreground/40' : ''}
                        ${isTodayDate ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-accent'}
                        transition-colors cursor-pointer
                      `}
                      title={`${format(day, 'MMM d')}: ${dayTasks.length} task(s)`}
                    >
                      <div className="text-[10px] font-medium">
                        {format(day, 'd')}
                      </div>
                      {dayTasks.length > 0 && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayTasks.slice(0, 3).map((task, idx) => (
                            <div
                              key={idx}
                              className={`h-1 w-1 rounded-full ${
                                task.priority === 'High' ? 'bg-[hsl(var(--priority-high))]' :
                                task.priority === 'Medium' ? 'bg-[hsl(var(--priority-medium))]' :
                                'bg-[hsl(var(--priority-low))]'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Today's Tasks Summary */}
            <div className="pt-2 border-t space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">Today's Tasks</p>
              {(() => {
                const todayTasks = getTasksForDate(new Date());
                if (todayTasks.length === 0) {
                  return (
                    <p className="text-[10px] text-muted-foreground/60 italic">No tasks for today</p>
                  );
                }
                return todayTasks.slice(0, 2).map((task) => (
                  <div key={task.id} className="flex items-center gap-1 text-[10px]">
                    <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                      task.priority === 'High' ? 'bg-[hsl(var(--priority-high))]' :
                      task.priority === 'Medium' ? 'bg-[hsl(var(--priority-medium))]' :
                      'bg-[hsl(var(--priority-low))]'
                    }`} />
                    <span className="truncate">{task.title}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{t('dashboard.customCard', 'Custom card content')}</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="max-w-[1800px] mx-auto p-4 sm:p-6 space-y-4">
        {/* Header - More compact */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-gradient-to-r from-background via-secondary/10 to-background border border-border/40 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {activeWorkspace ? activeWorkspace.name : t('dashboard.home', 'Home')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.subtitle', 'Overview of your workspace activities and recent updates')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('dashboard.customize', 'Customize')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowCardGallery(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('dashboard.addCard', 'Add Card')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={resetToDefault}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('dashboard.resetLayout', 'Reset Layout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Dashboard Cards Grid with Drag and Drop - Notion-style compact grid */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleCards.map((card) => card.id)}
            strategy={rectSortingStrategy}
          >
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" 
              style={{ 
                gridAutoRows: '280px',
                gridAutoFlow: 'row', // Changed from 'dense' to prevent overlap
                willChange: activeId ? 'contents' : 'auto',
              }}
            >
              {visibleCards.map((card) => (
                <DashboardCard
                  key={card.id}
                  config={card}
                  onRemove={removeCard}
                  onEdit={handleEditCard}
                  onResize={(id, width, height) => {
                    const card = cards.find(c => c.id === id);
                    if (!card) return;

                    // Update the resizing card - clear x, y to let grid auto-place
                    updateCard(id, { width, height, x: undefined, y: undefined });

                    // Find and adjust overlapping cards - clear their positions too
                    const updatedCard = { ...card, width, height };
                    const overlapping = findOverlappingCards(updatedCard, cards);
                    
                    if (overlapping.length > 0) {
                      const adjustments = adjustOverlappingCards(updatedCard, cards);
                      adjustments.forEach(adj => {
                        if (adj.id) {
                          // Clear x, y to let grid auto-place and avoid overlap
                          updateCard(adj.id, { ...adj, x: undefined, y: undefined });
                        }
                      });
                    }
                  }}
                >
                  {renderCardContent(card)}
                </DashboardCard>
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? (() => {
              const activeCard = visibleCards.find(card => card.id === activeId);
              return activeCard ? (
                <div className="w-[300px] opacity-90 rotate-2 shadow-2xl">
                  <DashboardCard
                    config={activeCard}
                    onRemove={undefined}
                    onEdit={undefined}
                    onResize={undefined}
                    isDragging={true}
                  >
                    {renderCardContent(activeCard)}
                  </DashboardCard>
                </div>
              ) : null;
            })() : null}
          </DragOverlay>
        </DndContext>

        {/* Empty State */}
        {visibleCards.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('dashboard.noCards', 'No cards to display')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.addCardsHint', 'Add cards to customize your dashboard')}
            </p>
            <Button onClick={() => setShowCustomizationDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.addFirstCard', 'Add Your First Card')}
            </Button>
          </div>
        )}
      </div>

      {/* Card Gallery Dialog */}
      <CardGallery
        open={showCardGallery}
        onOpenChange={setShowCardGallery}
        onSelectCard={handleSelectCardTemplate}
      />

      {/* Card Customization Dialog */}
      <CardCustomizationDialog
        open={showCustomizationDialog}
        onOpenChange={setShowCustomizationDialog}
        card={editingCard}
        onSave={handleSaveCard}
      />
    </div>
  );
}
