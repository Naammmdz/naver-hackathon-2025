import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/store/useSearchStore';
import { Languages, Menu, Monitor, Moon, Palette, Search, Sun } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationBell } from './NotificationBell';
import { OnlineUsers } from '@/components/board/OnlineUsers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClickupHeaderProps {
  onMenuClick?: () => void;
  currentView: 'tasks' | 'docs' | 'board' | 'home' | 'teams' | 'graph';
}

type ThemeMode = 'light' | 'dark' | 'system';

export const ClickupHeader = memo(function ClickupHeader({
  onMenuClick,
  currentView,
}: ClickupHeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const { t, i18n } = useTranslation();
  const openSearchModal = useSearchStore((state) => state.openWithPrefill);

  const handleOpenSearch = () => {
    const typeMap: Record<ClickupHeaderProps["currentView"], 'all' | 'task' | 'doc' | 'board'> = {
      home: 'all',
      tasks: 'task',
      docs: 'doc',
      board: 'board',
      teams: 'all',
      graph: 'all',
    };
    openSearchModal({ initialType: typeMap[currentView] });
  };

  const toggleLanguage = () => {
    const currentLang = i18n.language;
    const newLang = currentLang === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    root.style.transition = 'none';

    const resolvedMode =
      mode === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : mode;

    if (resolvedMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('theme', mode);
    setThemeMode(mode);
    setIsDark(resolvedMode === 'dark');

    // Force reflow
    root.offsetHeight;
    setTimeout(() => {
      root.style.transition = '';
    }, 50);
  }, []);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as ThemeMode | null) || 'system';
    applyTheme(savedTheme);
  }, [applyTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeMode === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyTheme, themeMode]);

  return (
    <header
      data-app-header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex h-10 items-center justify-between px-4 gap-4 mx-2 my-2 min-w-0">
        {/* Left Section - Logo + Website Name */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden hover-surface"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          {/* Logo + Name */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">DH</span>
            </div>
            <span className="hidden sm:inline font-semibold text-lg">DevHolic</span>
          </div>
        </div>

        {/* Center Section - Global Search Trigger */}
        <div className="flex-1 max-w-lg hidden lg:flex flex-shrink-0 justify-center">
          <Button
            type="button"
            variant="outline"
            className="w-full max-w-lg justify-start gap-3 text-muted-foreground bg-muted/40 border-border hover:bg-muted/60"
            onClick={handleOpenSearch}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t('header.searchPlaceholder', 'Search everything...')}</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘K / Ctrl+K</span>
          </Button>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Online Users - global presence (Google Docs style) */}
          <OnlineUsers maxVisible={4} size="sm" showLabel={false} />
          
          <div className="h-6 w-px bg-border hidden sm:block" />
          
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <NotificationBell />

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

          {/* Theme dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex hover-surface"
                title={t('header.themeSwitcher', 'Chọn giao diện')}
              >
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('header.colorMode', 'Chế độ màu')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={themeMode}
                onValueChange={(value) => applyTheme(value as ThemeMode)}
              >
                <DropdownMenuRadioItem value="light" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
                  {t('header.lightMode', 'Sáng')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
                  {t('header.darkMode', 'Tối')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  {t('header.systemMode', 'Theo hệ thống')}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}, (prevProps, nextProps) => {
  // Only re-render if currentView changes (for breadcrumb updates)
  // This prevents unnecessary re-renders that could reset OnlineUsers state
  return prevProps.currentView === nextProps.currentView;
});
