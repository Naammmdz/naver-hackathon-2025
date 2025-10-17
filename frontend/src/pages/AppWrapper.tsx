import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/taskStore';
import { CheckSquare, FileText, Languages, Moon, Search, Sun, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Docs from './Docs';
import Index from './Index';

export default function AppWrapper() {
  const [currentView, setCurrentView] = useState<'tasks' | 'docs'>('tasks');
  const [isDark, setIsDark] = useState(false);
  const { filters, setFilters } = useTaskStore();
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
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
    
    // Force a reflow to apply styles immediately
    document.documentElement.offsetHeight;
    
    // Re-enable transitions after a small delay
    setTimeout(() => {
      document.documentElement.style.transition = '';
    }, 50);
  };

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && systemDark);
    
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 gap-4">
          {/* Left section - Logo & Navigation */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              TF
            </div>
            <span className="font-bold text-lg">DevFlow</span>

            {/* View Tabs */}
            <nav className="flex items-center gap-1 ml-4">
              <Button
                variant={currentView === 'tasks' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'gap-2',
                  currentView === 'tasks' && 'bg-secondary'
                )}
                onClick={() => setCurrentView('tasks')}
              >
                <CheckSquare className="h-4 w-4" />
                Tasks
              </Button>
              
              <Button
                variant={currentView === 'docs' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'gap-2',
                  currentView === 'docs' && 'bg-secondary'
                )}
                onClick={() => setCurrentView('docs')}
              >
                <FileText className="h-4 w-4" />
                Documents
              </Button>
            </nav>
          </div>

          {/* Center section - Search (only show in tasks view) */}
          {currentView === 'tasks' && (
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('header.searchPlaceholder', 'Search tasks...')}
                  value={filters.search || ""}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 bg-muted/50 border-0 focus:bg-background h-9"
                />
              </div>
            </div>
          )}

          {/* Right section - Actions */}
          <div className="flex items-center gap-2">
            {currentView === 'tasks' && (
              <Button 
                onClick={() => {
                  // Trigger smart parser in tasks view
                  const event = new CustomEvent('openSmartParser');
                  window.dispatchEvent(event);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
                size="sm"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">{t('smartParser.title', 'Smart Create')}</span>
                <span className="sm:hidden">AI</span>
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="hidden sm:flex"
              title={i18n.language === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
            >
              <Languages className="h-4 w-4 mr-2" />
              {i18n.language === 'en' ? 'VI' : 'EN'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="hidden sm:flex"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width */}
      <main>
        {currentView === 'tasks' ? <Index /> : <Docs />}
      </main>
    </div>
  );
}
