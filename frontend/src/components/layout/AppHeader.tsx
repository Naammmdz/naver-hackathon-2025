import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTaskStore } from "@/store/taskStore";
import { Languages, Moon, Search, Settings, Sun, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface AppHeaderProps {
  onSmartCreate?: () => void;
}

export function AppHeader({ onSmartCreate }: AppHeaderProps) {
  const { filters, setFilters, toggleSidebar } = useTaskStore();
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
    <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="md:hidden"
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            {/* <TaskFlowLogo size={40} className="rounded-lg" /> */}
            <div>
              <h1 className="text-lg font-semibold">{t('header.title')}</h1>
              <p className="text-xs text-muted-foreground">{t('header.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Center section - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('header.searchPlaceholder')}
              value={filters.search || ""}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-muted/50 border-0 focus:bg-background"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Smart Create Button */}
          {onSmartCreate && (
            <Button 
              onClick={onSmartCreate}
              className="flex items-center gap-2 bg-gradient-to-r from-[#38bdf8] via-[#a855f7] to-[#f97316] hover:from-[#38bdf8]/90 hover:via-[#a855f7]/90 hover:to-[#f97316]/90 text-white shadow-md hover:shadow-lg transition-all"
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
  );
}
