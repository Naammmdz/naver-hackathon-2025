import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SearchResults } from "@/components/search/SearchResults";
import { useSearchStore } from "@/store/useSearchStore";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { SearchFilterType } from "@/lib/api/searchApi";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const typeOptions: Array<{ label: string; value: SearchFilterType }> = [
  { label: "Tất cả", value: "all" },
  { label: "Tasks", value: "task" },
  { label: "Docs", value: "doc" },
  { label: "Boards", value: "board" },
];

export const GlobalSearchModal = () => {
  const {
    isOpen,
    close,
    openWithPrefill,
    query,
    setQuery,
    type,
    setType,
    executeSearch,
    results,
    isLoading,
    recentQueries,
    selectResult,
    tookMs,
    total,
    error,
  } = useSearchStore();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openWithPrefill();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openWithPrefill]);

  const summary = useMemo(() => {
    if (!results.length || tookMs == null) {
      return null;
    }
    return `${total} kết quả · ${tookMs}ms`;
  }, [results.length, tookMs, total]);

  const showRecentSection = !isLoading && results.length === 0 && recentQueries.length > 0;

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => (open ? openWithPrefill() : close())}>
      <DialogTitle asChild>
        <VisuallyHidden>Global search modal</VisuallyHidden>
      </DialogTitle>
      <DialogDescription asChild>
        <VisuallyHidden>Tìm kiếm nhanh toàn bộ task, document và board</VisuallyHidden>
      </DialogDescription>
      <CommandInput
        placeholder="Tìm kiếm tasks, documents, boards…"
        value={query}
        onValueChange={setQuery}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void executeSearch();
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {typeOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant="ghost"
              onClick={() => {
                setType(option.value);
                void executeSearch({ type: option.value });
              }}
              className={cn(
                "h-6 rounded-full border px-3 text-xs",
                type === option.value ? "border-primary text-primary" : "border-transparent",
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px]">
          <span className="hidden sm:block text-muted-foreground">Nhấn ⌘K / Ctrl+K</span>
          {summary && <span className="font-medium text-foreground">{summary}</span>}
        </div>
      </div>

      {error && <div className="px-4 py-2 text-xs text-destructive">{error}</div>}

      <CommandList>
        <CommandEmpty>
          {isLoading ? "Đang tìm kiếm..." : "Không tìm thấy kết quả phù hợp"}
        </CommandEmpty>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tìm kiếm...
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <SearchResults results={results} onSelect={selectResult} />
        )}

        {showRecentSection && (
          <CommandGroup heading="Từ khóa gần đây">
            {recentQueries.map((recent) => (
              <CommandItem
                key={recent}
                value={recent}
                onSelect={() => {
                  setQuery(recent);
                  void executeSearch({ query: recent });
                }}
              >
                {recent}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

