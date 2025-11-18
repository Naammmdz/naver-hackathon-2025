import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceFilter } from '@/hooks/use-workspace-filter';
import { useDocumentStore } from '@/store/documentStore';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function DocumentSidebar() {
  const { t } = useTranslation();
  const {
    documents,
    activeDocumentId,
    addDocument,
    deleteDocument,
    restoreDocument,
    permanentlyDeleteDocument,
    setActiveDocument,
    updateDocument,
    getTrashedDocuments,
  } = useDocumentStore();

  // Filter documents by active workspace
  const workspaceFilteredDocs = useWorkspaceFilter(documents);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [documentToPermanentDelete, setDocumentToPermanentDelete] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [showNoSubdocs, setShowNoSubdocs] = useState<Set<string>>(new Set());
  const [showTrash, setShowTrash] = useState(false);

  // Apply workspace filter first, then trash and search filter
  const filteredDocuments = (showTrash ? getTrashedDocuments() : workspaceFilteredDocs.filter(doc => !doc.trashed))
    .filter((doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Get root level documents (no parent)
  const rootDocuments = filteredDocuments.filter(doc => !doc.parentId);

  // Get child documents for a parent
  const getChildDocuments = (parentId: string) => {
    return workspaceFilteredDocs.filter(doc => doc.parentId === parentId);
  };

  // Check if document has children
  const hasChildren = (docId: string) => {
    return workspaceFilteredDocs.some(doc => doc.parentId === docId);
  };

  // Toggle expanded state
  const toggleExpanded = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedDocs);
    const newShowNoSubdocs = new Set(showNoSubdocs);
    
    if (hasChildren(docId)) {
      // Document has children - toggle expansion
      if (newExpanded.has(docId)) {
        newExpanded.delete(docId);
      } else {
        newExpanded.add(docId);
      }
      // Remove any "no subdocs" state
      newShowNoSubdocs.delete(docId);
    } else {
      // Document has no children - toggle "No subdocuments" visibility
      if (newShowNoSubdocs.has(docId)) {
        newShowNoSubdocs.delete(docId);
      } else {
        newShowNoSubdocs.add(docId);
      }
    }
    
    setExpandedDocs(newExpanded);
    setShowNoSubdocs(newShowNoSubdocs);
  };

  // Render a document item (recursive for children)
  const renderDocumentItem = (doc: any, level: number = 0) => {
    const isExpanded = expandedDocs.has(doc.id);
    const showNoSubdocsMessage = showNoSubdocs.has(doc.id);
    const children = getChildDocuments(doc.id);
    const canExpand = hasChildren(doc.id);

    return (
      <div key={doc.id}>
        <div
          className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all ${
            activeDocumentId === doc.id 
              ? 'bg-primary/10 text-primary ring-1 ring-primary/20 dark:bg-muted/50 dark:text-muted-foreground dark:ring-muted-foreground/20 hover-surface' 
              : 'hover-surface text-muted-foreground'
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => setActiveDocument(doc.id)}
        >
          <span 
            className={`flex-shrink-0 text-muted-foreground transition-transform cursor-pointer hover:text-foreground`}
            onClick={(e) => toggleExpanded(doc.id, e)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
          
          {editingId === doc.id ? (
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit(doc.id);
                } else if (e.key === 'Escape') {
                  handleRenameCancel();
                }
              }}
              onBlur={() => handleRenameSubmit(doc.id)}
              autoFocus
              className="h-7 flex-1"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate text-sm">{doc.title}</span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {showTrash ? (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      restoreDocument(doc.id);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {t('components.DocumentSidebar.restore')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePermanentDeleteClick(doc.id);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('components.DocumentSidebar.deletePermanently')}
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      addDocument('Untitled', doc.id);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('components.DocumentSidebar.createSubdocument')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(doc.id, doc.title);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    {t('components.DocumentSidebar.rename')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(doc.id);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('components.DocumentSidebar.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Render children if expanded, or "No subdocuments" message */}
        {isExpanded && children.map(child => renderDocumentItem(child, level + 1))}
        {showNoSubdocsMessage && (
          <div 
            className="group flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground/70 italic transition-colors hover:text-primary/80 hover:bg-primary/10 dark:hover:bg-muted/40 dark:hover:text-muted-foreground rounded-md"
            style={{ paddingLeft: `${8 + (level + 1) * 16}px` }}
          >
            <span className="opacity-40 transition-opacity group-hover:opacity-60">└──</span>
            {t('components.DocumentSidebar.noSubdocuments')}
          </div>
        )}
      </div>
    );
  };

  const handleCreateDocument = () => {
    addDocument('Untitled');
  };

  const handleDeleteClick = (id: string) => {
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (documentToDelete) {
      deleteDocument(documentToDelete);
      setDocumentToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handlePermanentDeleteClick = (id: string) => {
    setDocumentToPermanentDelete(id);
    setPermanentDeleteDialogOpen(true);
  };

  const handlePermanentDeleteConfirm = () => {
    if (documentToPermanentDelete) {
      permanentlyDeleteDocument(documentToPermanentDelete);
      setDocumentToPermanentDelete(null);
    }
    setPermanentDeleteDialogOpen(false);
  };

  const handleRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleRenameSubmit = (id: string) => {
    if (editingTitle.trim()) {
      updateDocument(id, { title: editingTitle.trim() });
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  return (
    <>
      <div className="w-64 border-r bg-card flex flex-col h-full rounded-tl-lg rounded-bl-lg">
        {/* Header */}
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {showTrash ? t('components.DocumentSidebar.trashTitle') : t('components.DocumentSidebar.documentsTitle')}
            </h2>
            <div className="flex items-center gap-1">
              {!showTrash && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCreateDocument}
                  className="h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t('components.DocumentSidebar.searchDocsPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm bg-muted/50 border-0 focus:bg-background rounded-lg"
            />
          </div>
        </div>

        {/* Document List */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {filteredDocuments.length === 0 ? (
              <div className="group text-center py-12 px-4 text-muted-foreground/75 text-sm transition-colors hover:text-primary/80 hover:bg-primary/5 dark:hover:bg-muted/40 rounded-xl border border-dashed border-muted-foreground/20 hover:border-primary/30">
                {searchQuery ? (
                  <>
                    <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60 group-hover:text-primary/70 transition-colors" />
                    <p className="mb-1 font-medium text-foreground/80 group-hover:text-primary transition-colors">{t('components.DocumentSidebar.noDocumentsFound')}</p>
                    <p className="text-xs text-muted-foreground/70 group-hover:text-primary/60 transition-colors">{t('components.DocumentSidebar.tryDifferentSearch')}</p>
                  </>
                ) : (
                  <>
                    <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60 group-hover:text-primary/70 transition-colors" />
                    <p className="mb-1 font-medium text-foreground/80 group-hover:text-primary transition-colors">{t('components.DocumentSidebar.noDocumentsYet')}</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleCreateDocument}
                      className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/90 transition-colors"
                    >
                      {t('components.DocumentSidebar.createFirstDocument')}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <>
                {rootDocuments.map(doc => renderDocumentItem(doc))}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t space-y-2 flex-shrink-0">
          <div className="text-xs text-muted-foreground px-2">
            <span className="font-medium">
              {showTrash 
                ? `${getTrashedDocuments().length} ${getTrashedDocuments().length === 1 ? t('components.DocumentSidebar.item') : t('components.DocumentSidebar.items')}`
                : `${documents.filter(doc => !doc.trashed).length} ${documents.filter(doc => !doc.trashed).length === 1 ? t('components.DocumentSidebar.document') : t('components.DocumentSidebar.documents')}`
              }
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTrash(!showTrash)}
            className="w-full justify-start h-8 px-2 text-xs gap-2 hover:bg-muted transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {showTrash ? t('components.DocumentSidebar.backToDocuments') : t('components.DocumentSidebar.viewTrash')}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('components.DocumentSidebar.deleteDocument')}</DialogTitle>
            <DialogDescription>
              {t('components.DocumentSidebar.deleteDocumentDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('components.DocumentSidebar.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {t('components.DocumentSidebar.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('components.DocumentSidebar.deletePermanently')}</DialogTitle>
            <DialogDescription>
              {t('components.DocumentSidebar.deletePermanentlyDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermanentDeleteDialogOpen(false)}>
              {t('components.DocumentSidebar.cancel')}
            </Button>
            <Button variant="destructive" onClick={handlePermanentDeleteConfirm}>
              {t('components.DocumentSidebar.deletePermanentlyButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
