import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InviteNotifications } from '@/components/workspace/InviteNotifications';
import { ReadOnlyBadge } from '@/components/workspace/ReadOnlyBadge';
import { useTaskStore } from '@/store/taskStore';
import { Languages, Menu, Moon, Search, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { OnlineUsers } from "@/components/board/OnlineUsers";

interface ClickupHeaderProps {
  onMenuClick?: () => void;
  currentView: 'tasks' | 'docs' | 'board' | 'settings';
  onNavigateToSettings?: () => void;
}

export function ClickupHeader({
  onMenuClick,
  currentView,
  onNavigateToSettings,
}: ClickupHeaderProps) {
  const { filters, setFilters } = useTaskStore();
  const [isDark, setIsDark] = useState(false);
  const { t, i18n } = useTranslation();

  const handleSearchChange = (value: string) => {
    setFilters({ search: value });
  };

  const toggleLanguage = () => {
    const currentLang = i18n.language;
    const newLang = currentLang === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    // Disable transitions temporarily to prevent yellow flash
    document.documentElement.style.transition = 'none';

    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');

    // Force a reflow to apply styles immediately
    void document.documentElement.offsetHeight;

    // Re-enable transitions after a small delay
    setTimeout(() => {
      document.documentElement.style.transition = '';
    }, 50);
  };

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);

    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  return (
    <header
      data-app-header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex h-10 items-center justify-between px-4 gap-4 mx-2 my-2">
        {/* Left Section - Workspace & Search */}
        <div className="flex items-center gap-3 flex-1">
          {/* Workspace Selector */}
          <div className="hidden sm:block min-w-[200px]">
            <WorkspaceSwitcher onNavigateToSettings={onNavigateToSettings} />
          </div>

          <div className="hidden sm:block h-6 w-px bg-border" />

          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              / {currentView === 'tasks' && 'Tasks'}
              {currentView === 'docs' && 'Documents'}
              {currentView === 'board' && 'Board'}
              {currentView === 'settings' && 'Settings'}
            </span>
          </div>
        </div>

        {/* Center Section - Search (ClickUp style) */}
        <div className="flex-1 max-w-lg hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('header.searchPlaceholder', 'Search everything...')}
              value={filters.search || ''}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-10 bg-muted/40 border-0 h-9 text-sm rounded-lg hover:bg-primary/5 focus:ring-primary focus:ring-offset-0"
            />
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3">
          {/* Read Only Badge */}
          <ReadOnlyBadge />
          
          {/* Online Users - global presence */}
          <OnlineUsers maxVisible={3} size="md" showLabel={false} />
          
          <div className="h-6 w-px bg-border hidden sm:block" />
          
          <div className="flex items-center gap-1">
            {/* Notifications - Real-time Invites */}
            <InviteNotifications />

            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="hidden sm:flex gap-1 hover-surface"
              title={
                i18n.language === 'en'
                  ? 'Switch to Vietnamese'
                  : 'Chuyển sang tiếng Anh'
              }
            >
              <Languages className="h-4 w-4" />
            </Button>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="hidden sm:flex hover-surface"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Mobile Menu */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="sm:hidden hover-surface"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
