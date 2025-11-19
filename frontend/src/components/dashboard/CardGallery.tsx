import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  FileText,
  Layers,
  BarChart3,
  MessageSquare,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  Target,
  Sparkles,
  Link as LinkIcon,
  ListTodo,
  Activity,
  Search,
  Star,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardCardConfig } from "./DashboardCard";

interface CardTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'featured' | 'overview' | 'ai' | 'analytics' | 'custom';
  preview: string;
  size: 'small' | 'medium' | 'large' | 'full';
  color: string;
  badge?: string;
}

interface CardGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCard: (template: CardTemplate) => void;
}

export function CardGallery({ open, onOpenChange, onSelectCard }: CardGalleryProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const cardTemplates: CardTemplate[] = [
    // Featured Cards
    {
      id: 'tasks-overview',
      name: t('dashboard.tasksOverview', 'Tasks Overview'),
      description: t('dashboard.tasksOverviewDesc', 'Display task statistics with status breakdown'),
      icon: <CheckSquare className="h-5 w-5 text-primary" />,
      category: 'featured',
      preview: '/home-assets/task-preview.jpg',
      size: 'medium',
      color: 'border-l-primary',
      badge: 'Popular',
    },
    {
      id: 'recent-documents',
      name: t('dashboard.recentDocuments', 'Recent Documents'),
      description: t('dashboard.recentDocsDesc', 'Show latest updated documents with quick access'),
      icon: <FileText className="h-5 w-5 text-secondary" />,
      category: 'featured',
      preview: '/home-assets/doc-preview.jpg',
      size: 'medium',
      color: 'border-l-secondary',
      badge: 'Popular',
    },
    {
      id: 'recent-boards',
      name: t('dashboard.recentBoards', 'Recent Boards'),
      description: t('dashboard.recentBoardsDesc', 'Display recently updated whiteboards'),
      icon: <Layers className="h-5 w-5 text-accent" />,
      category: 'featured',
      preview: '/home-assets/board-preview.jpg',
      size: 'medium',
      color: 'border-l-accent',
    },
    {
      id: 'recent-tasks',
      name: t('dashboard.recentTasks', 'Recent Tasks'),
      description: t('dashboard.recentTasksDesc', 'Show latest updated tasks with quick access'),
      icon: <CheckSquare className="h-5 w-5 text-primary" />,
      category: 'featured',
      preview: '/home-assets/task-preview.jpg',
      size: 'medium',
      color: 'border-l-primary',
      badge: 'Popular',
    },

    // Overview Cards
    {
      id: 'documents-stat',
      name: t('dashboard.documentsCount', 'Documents Count'),
      description: t('dashboard.documentsCountDesc', 'Total number of documents'),
      icon: <FileText className="h-5 w-5 text-secondary" />,
      category: 'overview',
      preview: '',
      size: 'small',
      color: 'border-l-secondary',
    },
    {
      id: 'boards-stat',
      name: t('dashboard.boardsCount', 'Boards Count'),
      description: t('dashboard.boardsCountDesc', 'Total number of boards'),
      icon: <Layers className="h-5 w-5 text-accent" />,
      category: 'overview',
      preview: '',
      size: 'small',
      color: 'border-l-accent',
    },
    {
      id: 'team-stat',
      name: t('dashboard.teamMembers', 'Team Members'),
      description: t('dashboard.teamMembersDesc', 'Number of workspace members'),
      icon: <Users className="h-5 w-5 text-success" />,
      category: 'overview',
      preview: '',
      size: 'small',
      color: 'border-l-success',
    },

    // AI & Smart Cards
    {
      id: 'ai-chat',
      name: t('dashboard.aiChat', 'AI Chat'),
      description: t('dashboard.aiChatDesc', 'Quick access to AI assistant conversations'),
      icon: <MessageSquare className="h-5 w-5 text-primary" />,
      category: 'ai',
      preview: '',
      size: 'medium',
      color: 'border-l-primary',
      badge: 'New',
    },
    {
      id: 'smart-parser',
      name: t('dashboard.smartParser', 'Smart Task Parser'),
      description: t('dashboard.smartParserDesc', 'Create tasks using natural language'),
      icon: <Sparkles className="h-5 w-5 text-warning" />,
      category: 'ai',
      preview: '',
      size: 'medium',
      color: 'border-l-warning',
      badge: 'New',
    },
    {
      id: 'ai-suggestions',
      name: t('dashboard.aiSuggestions', 'AI Suggestions'),
      description: t('dashboard.aiSuggestionsDesc', 'Get AI-powered task recommendations'),
      icon: <Sparkles className="h-5 w-5 text-primary" />,
      category: 'ai',
      preview: '',
      size: 'small',
      color: 'border-l-primary',
    },

    // Analytics Cards
    {
      id: 'task-analytics',
      name: t('dashboard.taskAnalytics', 'Task Analytics'),
      description: t('dashboard.taskAnalyticsDesc', 'Visualize task completion trends'),
      icon: <BarChart3 className="h-5 w-5 text-primary" />,
      category: 'analytics',
      preview: '',
      size: 'large',
      color: 'border-l-primary',
    },
    {
      id: 'productivity-score',
      name: t('dashboard.productivityScore', 'Productivity Score'),
      description: t('dashboard.productivityScoreDesc', 'Track your productivity metrics'),
      icon: <TrendingUp className="h-5 w-5 text-success" />,
      category: 'analytics',
      preview: '',
      size: 'small',
      color: 'border-l-success',
    },
    {
      id: 'time-tracking',
      name: t('dashboard.timeTracking', 'Time Tracking'),
      description: t('dashboard.timeTrackingDesc', 'Monitor time spent on tasks'),
      icon: <Clock className="h-5 w-5 text-secondary" />,
      category: 'analytics',
      preview: '',
      size: 'small',
      color: 'border-l-secondary',
    },
    {
      id: 'completion-rate',
      name: t('dashboard.completionRate', 'Completion Rate'),
      description: t('dashboard.completionRateDesc', 'View task completion percentage'),
      icon: <Target className="h-5 w-5 text-primary" />,
      category: 'analytics',
      preview: '',
      size: 'small',
      color: 'border-l-primary',
    },

    // Custom Cards
    {
      id: 'calendar-view',
      name: t('dashboard.calendarView', 'Calendar View'),
      description: t('dashboard.calendarViewDesc', 'Upcoming tasks in calendar format'),
      icon: <Calendar className="h-5 w-5 text-primary" />,
      category: 'custom',
      preview: '',
      size: 'large',
      color: 'border-l-primary',
    },
    {
      id: 'quick-actions',
      name: t('dashboard.quickActions', 'Quick Actions'),
      description: t('dashboard.quickActionsDesc', 'Shortcuts to common actions'),
      icon: <Activity className="h-5 w-5 text-primary" />,
      category: 'custom',
      preview: '',
      size: 'full',
      color: 'border-l-primary',
    },
    {
      id: 'embed-link',
      name: t('dashboard.embedLink', 'Embedded Link'),
      description: t('dashboard.embedLinkDesc', 'Embed external content or links'),
      icon: <LinkIcon className="h-5 w-5 text-primary" />,
      category: 'custom',
      preview: '',
      size: 'medium',
      color: 'border-l-primary',
    },
    {
      id: 'todo-list',
      name: t('dashboard.todoList', 'Quick Todo List'),
      description: t('dashboard.todoListDesc', 'Simple todo list widget'),
      icon: <ListTodo className="h-5 w-5 text-success" />,
      category: 'custom',
      preview: '',
      size: 'small',
      color: 'border-l-success',
    },
  ];

  const categories = [
    { id: 'all', label: t('dashboard.allCards', 'All Cards'), icon: Star },
    { id: 'featured', label: t('dashboard.featured', 'Featured'), icon: Star },
    { id: 'overview', label: t('dashboard.overview', 'Overview'), icon: CheckSquare },
    { id: 'ai', label: t('dashboard.aiCards', 'AI & Smart'), icon: Sparkles },
    { id: 'analytics', label: t('dashboard.analytics', 'Analytics'), icon: BarChart3 },
    { id: 'custom', label: t('dashboard.custom', 'Custom'), icon: Activity },
  ];

  const filteredTemplates = cardTemplates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">
            {t('dashboard.addCard', 'Add Card')}
          </DialogTitle>
          <DialogDescription>
            {t('dashboard.selectCardType', 'Choose a card type to add to your dashboard')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-full overflow-hidden">
          {/* Sidebar - Categories */}
          <div className="w-48 border-r p-4 space-y-1">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('dashboard.searchCards', 'Search cards...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Cards Grid */}
            <ScrollArea className="flex-1 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      onSelectCard(template);
                      onOpenChange(false);
                    }}
                    className="group relative rounded-lg border-2 border-dashed hover:border-solid hover:border-primary/50 hover:bg-accent transition-all text-left overflow-hidden"
                  >
                    {/* Preview Image */}
                    {template.preview && (
                      <div className="h-32 overflow-hidden bg-muted">
                        <img
                          src={template.preview}
                          alt={template.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {template.icon}
                          <h3 className="font-semibold text-sm">{template.name}</h3>
                        </div>
                        {template.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {template.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </button>
                ))}
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t('dashboard.noCardsFound', 'No cards found')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.tryDifferentSearch', 'Try a different search term or category')}
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { CardTemplate };

