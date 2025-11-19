import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/search";
import DOMPurify from "dompurify";
import { FileText, KanbanSquare, ListChecks, Search } from "lucide-react";
import { useMemo, type ReactNode } from "react";

interface SearchResultItemProps {
  result: SearchResult;
}

const typeIconMap: Record<SearchResult["type"], ReactNode> = {
  task: <ListChecks className="h-4 w-4" />,
  doc: <FileText className="h-4 w-4" />,
  board: <KanbanSquare className="h-4 w-4" />,
};

export function SearchResultItem({ result }: SearchResultItemProps) {
  const sanitizedSnippet = useMemo(() => {
    if (!result.snippet) {
      return "";
    }
    return DOMPurify.sanitize(result.snippet);
  }, [result.snippet]);

  const updatedAt = useMemo(() => {
    if (!result.updatedAt) {
      return null;
    }
    try {
      return new Date(result.updatedAt).toLocaleString();
    } catch {
      return null;
    }
  }, [result.updatedAt]);

  const metadataBadges = (() => {
    const metadata = result.metadata as Record<string, unknown> | undefined;
    if (!metadata) {
      return null;
    }
    const items: Array<{ label: string; value: string }> = [];
    if (typeof metadata.status === "string") {
      items.push({ label: "Trạng thái", value: String(metadata.status) });
    }
    if (typeof metadata.priority === "string") {
      items.push({ label: "Độ ưu tiên", value: String(metadata.priority) });
    }
    if (typeof metadata.icon === "string") {
      items.push({ label: "Biểu tượng", value: String(metadata.icon) });
    }
    return items.length
      ? items.map((item) => (
          <Badge key={`${result.id}-${item.label}`} variant="secondary" className="capitalize">
            {item.value}
          </Badge>
        ))
      : null;
  })();

  return (
    <div className="w-full px-3 py-2 text-left">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {typeIconMap[result.type] ?? <Search className="h-4 w-4" />}
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-foreground">{result.title || "Không có tiêu đề"}</div>
          <div
            className={cn(
              "line-clamp-2 text-xs text-muted-foreground",
              sanitizedSnippet ? "leading-relaxed" : "italic",
            )}
            dangerouslySetInnerHTML={
              sanitizedSnippet
                ? { __html: sanitizedSnippet }
                : { __html: "<span>Không có mô tả</span>" }
            }
          />
          <div className="flex flex-wrap gap-2 items-center text-[11px] text-muted-foreground">
            <span className="capitalize font-medium">
              {result.type === "task" ? "Task" : result.type === "doc" ? "Document" : "Board"}
            </span>
            {metadataBadges}
            {updatedAt && <span>Cập nhật {updatedAt}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

