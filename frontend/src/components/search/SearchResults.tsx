import { CommandGroup, CommandItem } from "@/components/ui/command";
import type { SearchResult } from "@/types/search";
import { SearchResultItem } from "@/components/search/SearchResultItem";

interface SearchResultsProps {
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
}

const typeLabels: Record<SearchResult["type"], string> = {
  task: "Tasks",
  doc: "Documents",
  board: "Boards",
};

export function SearchResults({ results, onSelect }: SearchResultsProps) {
  const grouped = results.reduce<Record<SearchResult["type"], SearchResult[]>>(
    (acc, result) => {
      acc[result.type] = acc[result.type] ? [...acc[result.type], result] : [result];
      return acc;
    },
    { task: [], doc: [], board: [] },
  );

  return (
    <>
      {(Object.keys(grouped) as SearchResult["type"][]).map((type) => {
        if (!grouped[type]?.length) {
          return null;
        }
        return (
          <CommandGroup key={type} heading={typeLabels[type]}>
            {grouped[type].map((result) => (
              <CommandItem
                key={result.id}
                value={`${result.type}-${result.title}`}
                onSelect={() => onSelect(result)}
                className="px-0"
              >
                <SearchResultItem result={result} />
              </CommandItem>
            ))}
          </CommandGroup>
        );
      })}
    </>
  );
}

