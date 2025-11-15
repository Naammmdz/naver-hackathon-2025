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
import { CheckSquare, FileText, Layers, TrendingUp, Users, Plus, Settings2, RotateCcw, MessageSquare, Sparkles, BarChart3, Calendar, Clock, Link2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, format, addMonths, subMonths, isSameMonth } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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

export default function Home({ onViewChange }: { onViewChange: (view: 'tasks' | 'docs' | 'board' | 'home' | 'teams') => void }) {
  const { t } = useTranslation();
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
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

  // Drag and drop - Improved sensitivity
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before activating drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex((card) => card.id === active.id);
      const newIndex = cards.findIndex((card) => card.id === over.id);
      const newCards = arrayMove(cards, oldIndex, newIndex);
      reorderCards(newCards);
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
              <div className="rounded bg-muted/50 p-1.5 text-center">
                <p className="text-sm font-semibold">{todoTasks}</p>
                <p className="text-[9px] text-muted-foreground">{t('tasks.status.todo', 'Todo')}</p>
              </div>
              <div className="rounded bg-blue-500/10 p-1.5 text-center">
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{inProgressTasks}</p>
                <p className="text-[9px] text-muted-foreground">{t('tasks.status.inProgress', 'In Progress')}</p>
              </div>
              <div className="rounded bg-green-500/10 p-1.5 text-center">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">{doneTasks}</p>
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
                      className="flex items-center gap-1.5 p-1.5 rounded hover:bg-muted/50 transition-colors text-[11px]"
                    >
                      <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
                        task.status === 'Done' ? 'bg-green-500' :
                        task.status === 'In Progress' ? 'bg-blue-500' :
                        'bg-gray-400'
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
              <div className="rounded-full bg-orange-500/10 p-3">
                <FileText className="h-6 w-6 text-orange-500" />
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
              <div className="rounded-full bg-pink-500/10 p-3">
                <Layers className="h-6 w-6 text-pink-500" />
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
              <div className="rounded-full bg-green-500/10 p-3">
                <Users className="h-6 w-6 text-green-500" />
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
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {member.user?.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt={member.user.fullName || member.user.email}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {(member.user?.fullName || member.user?.email || '?')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      {/* Role badge */}
                      {member.role === 'OWNER' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-yellow-500 border border-background flex items-center justify-center">
                          <span className="text-[6px] text-white font-bold">★</span>
                        </div>
                      )}
                      {member.role === 'ADMIN' && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 border border-background" />
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
                      if (!snapshot?.store) return { count: 0, types: [] };
                      const store = snapshot.store;
                      const shapes = Object.values(store).filter((item: any) => 
                        item?.typeName === 'shape'
                      );
                      const types = shapes.map((shape: any) => shape.type).slice(0, 5);
                      return { count: shapes.length, types };
                    } catch (error) {
                      return { count: 0, types: [] };
                    }
                  };

                  const boardInfo = getBoardInfo(board.snapshot);
                  
                  // Generate visual preview based on shape types
                  const getShapeIcon = (type: string) => {
                    const iconMap: Record<string, string> = {
                      'geo': '▭',
                      'draw': '✏️',
                      'text': 'T',
                      'arrow': '→',
                      'line': '—',
                      'frame': '⬚',
                      'image': '🖼',
                      'note': '📝',
                    };
                    return iconMap[type] || '●';
                  };

                  return (
                    <button
                      key={board.id}
                      onClick={() => {
                        useBoardStore.getState().setActiveBoard(board.id);
                        onViewChange('board');
                      }}
                      className="w-full text-left rounded border hover:border-primary/50 hover:bg-accent/50 transition-all group overflow-hidden"
                    >
                      {/* Visual Preview Section */}
                      <div className="relative h-20 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border-b overflow-hidden">
                        {/* Abstract shapes visualization */}
                        <div className="absolute inset-0 flex items-center justify-center gap-1 p-2">
                          {boardInfo.types.length > 0 ? (
                            boardInfo.types.map((type, idx) => (
                              <div
                                key={idx}
                                className="text-lg opacity-40 group-hover:opacity-60 transition-opacity"
                                style={{
                                  transform: `rotate(${idx * 15 - 30}deg) scale(${1 - idx * 0.1})`,
                                  color: `hsl(${300 + idx * 20}, 70%, 50%)`
                                }}
                              >
                                {getShapeIcon(type)}
                              </div>
                            ))
                          ) : (
                            <Layers className="h-8 w-8 text-pink-300 dark:text-pink-700 opacity-30" />
                          )}
                        </div>
                        
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                      </div>

                      {/* Info Section */}
                      <div className="p-2 space-y-0.5">
                        <p className="text-[11px] font-semibold truncate group-hover:text-primary transition-colors">
                          {board.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
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

        const completionRate = workspaceTasks.length > 0 
          ? Math.round((doneTasks / workspaceTasks.length) * 100) 
          : 0;

        return (
          <div className="space-y-3 h-full flex flex-col">
            {/* Completion Rate */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
              <div className="rounded-full bg-purple-500/10 p-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
            </div>

            {/* 7-Day Trend */}
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">7-Day Completion Trend</p>
              <div className="flex items-end justify-between gap-1 h-24">
                {completionByDay.map((day, idx) => {
                  const maxCompleted = Math.max(...completionByDay.map(d => d.completed), 1);
                  const height = (day.completed / maxCompleted) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-muted rounded-t relative" style={{ height: '80px' }}>
                        <div 
                          className="absolute bottom-0 w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t transition-all"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{day.day}</span>
                      <span className="text-[10px] font-semibold">{day.completed}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority Breakdown */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">By Priority</p>
              <div className="flex gap-2">
                <div className="flex-1 rounded bg-red-500/10 p-2 text-center">
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">{priorityBreakdown.high}</p>
                  <p className="text-[9px] text-muted-foreground">High</p>
                </div>
                <div className="flex-1 rounded bg-yellow-500/10 p-2 text-center">
                  <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{priorityBreakdown.medium}</p>
                  <p className="text-[9px] text-muted-foreground">Medium</p>
                </div>
                <div className="flex-1 rounded bg-gray-500/10 p-2 text-center">
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">{priorityBreakdown.low}</p>
                  <p className="text-[9px] text-muted-foreground">Low</p>
                </div>
              </div>
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
                                task.priority === 'High' ? 'bg-red-500' :
                                task.priority === 'Medium' ? 'bg-yellow-500' :
                                'bg-gray-400'
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
                      task.priority === 'High' ? 'bg-red-500' :
                      task.priority === 'Medium' ? 'bg-yellow-500' :
                      'bg-gray-400'
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
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-[1800px] mx-auto p-4 sm:p-6 space-y-4">
        {/* Header - More compact */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
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
                <DropdownMenuItem onClick={() => {
                  setEditingCard(null);
                  setShowCustomizationDialog(true);
                }}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  {t('dashboard.customCard', 'Custom Card')}
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
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleCards.map((card) => card.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" style={{ gridAutoRows: '280px' }}>
              {visibleCards.map((card) => (
                <DashboardCard
                  key={card.id}
                  config={card}
                  onRemove={removeCard}
                  onEdit={handleEditCard}
                >
                  {renderCardContent(card)}
                </DashboardCard>
              ))}
            </div>
          </SortableContext>
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
