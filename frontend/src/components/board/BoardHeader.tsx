import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

interface BoardHeaderProps {
  boardTitle?: string;
  onSearch?: (query: string) => void;
}

export function BoardHeader({ boardTitle = "Board", onSearch }: BoardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div className="h-14 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex items-center justify-between px-4 gap-2 sm:gap-4">
      {/* Left: Board Title - Hidden on very small screens when search is active */}
      <div className="flex items-center gap-3 min-w-0 max-sm:hidden">
        <h1 className="text-lg font-semibold truncate">{boardTitle}</h1>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end max-w-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9 bg-background/50"
          />
        </div>
      </div>
    </div>
  );
}
