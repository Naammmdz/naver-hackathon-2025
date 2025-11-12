import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/store/documentStore';
import { FileText, ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface DocsWidgetProps {
  onNavigate: () => void;
}

export function DocsWidget({ onNavigate }: DocsWidgetProps) {
  const documents = useDocumentStore((state) => state.documents);
  
  // Get recent documents (max 5)
  const recentDocs = documents
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const totalDocs = documents.length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-2">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-foreground">My Docs</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onNavigate} className="gap-1">
          View All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-4 rounded-lg border border-border/60 bg-muted/30 p-4 text-center">
        <div className="text-3xl font-bold text-orange-600 dark:text-orange-500">{totalDocs}</div>
        <div className="text-xs text-muted-foreground">Total Documents</div>
      </div>

      {/* Recent Docs */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {recentDocs.length > 0 ? (
          recentDocs.map((doc) => (
            <div
              key={doc.id}
              className="group cursor-pointer rounded-lg border border-border/60 bg-card p-3 transition-all hover:border-orange-500/50 hover:shadow-sm"
              onClick={onNavigate}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{doc.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20">
            <p className="text-sm text-muted-foreground">No documents yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
