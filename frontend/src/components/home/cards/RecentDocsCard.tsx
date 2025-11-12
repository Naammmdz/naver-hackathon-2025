import { useDocumentStore } from '@/store/documentStore';
import { Clock, ChevronRight, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface RecentDocsCardProps {
  onNavigate: () => void;
}

export function RecentDocsCard({ onNavigate }: RecentDocsCardProps) {
  const documents = useDocumentStore((state) => state.documents);
  
  const recentDocs = documents
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Docs</h3>
        <Button variant="ghost" size="sm" onClick={onNavigate} className="h-7 gap-1 px-2 text-xs">
          View All
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {recentDocs.length > 0 ? (
          recentDocs.map((doc) => (
            <div
              key={doc.id}
              className="group cursor-pointer rounded-md border border-border/40 bg-background/50 p-2.5 transition-all hover:border-orange-500/50 hover:bg-background"
              onClick={onNavigate}
            >
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-500" />
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-1 text-xs font-medium text-foreground">{doc.title}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(doc.updatedAt), 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/40 bg-muted/10">
            <p className="text-xs text-muted-foreground">No documents yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
