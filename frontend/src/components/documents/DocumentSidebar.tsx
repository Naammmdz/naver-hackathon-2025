import { SidebarItem } from '@/components/layout/SidebarItem';
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
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceFilter } from '@/hooks/use-workspace-filter';
import { useDocumentStore } from '@/store/documentStore';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import {
  ChevronLeft,
  Edit2,
  FileText,
  Network,
  Edit,
  Plus,
  Search,
  Trash2,
  Upload,
  Loader2
} from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

const sidebarSurfaceStyle: CSSProperties = {
  background: 'linear-gradient(180deg, color-mix(in oklch, var(--sidebar) 98%, transparent) 0%, color-mix(in oklch, var(--sidebar) 88%, transparent) 100%)',
  borderColor: 'color-mix(in oklch, var(--sidebar-border) 80%, transparent)',
  boxShadow: '0 20px 45px color-mix(in oklch, var(--shadow-color) 12%, transparent)',
};

interface DocumentSidebarProps {
  onCollapse?: () => void;
  viewMode?: "editor" | "graph";
  onViewModeChange?: (mode: "editor" | "graph") => void;
}

export default function DocumentSidebar({
  onCollapse,
  viewMode = "editor",
  onViewModeChange,
}: DocumentSidebarProps) {
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
    loadDocuments,
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
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
    const isProcessing = doc.status === 'processing';

    const actions = isProcessing ? null : showTrash ? (
      <>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            restoreDocument(doc.id);
          }}
        >
          <FileText className="h-4 w-4 mr-2" />
          {t("components.DocumentSidebar.restore")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handlePermanentDeleteClick(doc.id);
          }}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t("components.DocumentSidebar.deletePermanently")}
        </DropdownMenuItem>
      </>
    ) : (
      <>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            addDocument(t("components.DocumentSidebar.untitled"), doc.id);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("components.DocumentSidebar.createSubdocument")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleRename(doc.id, doc.title);
          }}
        >
          <Edit2 className="h-4 w-4 mr-2" />
          {t("components.DocumentSidebar.rename")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(doc.id);
          }}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t("components.DocumentSidebar.delete")}
        </DropdownMenuItem>
      </>
    );

    return (
      <div key={doc.id}>
        <SidebarItem
          title={doc.title}
          isActive={activeDocumentId === doc.id}
          isExpanded={isExpanded}
          level={level}
          onToggleExpand={(e) => toggleExpanded(doc.id, e)}
          onClick={() => !isProcessing && setActiveDocument(doc.id)}
          isEditing={editingId === doc.id}
          editingValue={editingTitle}
          onEditChange={setEditingTitle}
          onEditSubmit={() => handleRenameSubmit(doc.id)}
          onEditCancel={handleRenameCancel}
          actions={actions}
          icon={isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : undefined}
        />

        {/* Render children if expanded, or "No subdocuments" message */}
        {isExpanded && children.map(child => renderDocumentItem(child, level + 1))}
        {showNoSubdocsMessage && (
          <div
            className="group flex items-center gap-2 px-2 py-1 text-xs text-sidebar-foreground/70 italic transition-colors hover:text-primary/80 hover:bg-primary/10 dark:hover:bg-muted/40 dark:hover:text-sidebar-foreground rounded-md"
            style={{ paddingLeft: `${8 + (level + 1) * 16}px` }}
          >
            <span className="opacity-40 transition-opacity group-hover:opacity-60">└──</span>
            {t("components.DocumentSidebar.noSubdocuments")}
          </div>
        )}
      </div>
    );
  };

  const handleCreateDocument = () => {
    addDocument(t("components.DocumentSidebar.untitled"));
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
      <div
        className="w-64 bg-sidebar/90 text-sidebar-foreground flex flex-col h-full rounded-3xl shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:shadow-[0_28px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        style={sidebarSurfaceStyle}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
              {showTrash ? t("components.DocumentSidebar.headerTitleTrash") : t("components.DocumentSidebar.headerTitle")}
            </h2>
            <div className="flex items-center gap-2">
              {!showTrash && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setUploadDialogOpen(true)}
                    className="h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground transition-colors"
                    title={t("documents.upload.tooltip", "Upload Document")}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCreateDocument}
                    className="h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              )}
              {onCollapse && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 border border-sidebar-border/50 rounded-full hover:border-primary/50 hover:text-primary"
                  onClick={onCollapse}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">{t("components.DocumentSidebar.hideSidebar")}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/60" />
            <Input
              placeholder={t("components.DocumentSidebar.searchDocsPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm bg-muted border-border/50 focus-visible:ring-primary/30 rounded-lg"
            />
          </div>

          {/* View Switcher */}
          {onViewModeChange && (
            <div className="flex items-center justify-between rounded-2xl bg-sidebar/30 border border-sidebar-border/40 px-2 py-1.5">
              <span className="text-xs uppercase tracking-wide text-sidebar-foreground/60">
                {t("components.DocumentSidebar.viewMode", "View")}
              </span>
              <div className="flex border border-sidebar-border/40 rounded-xl overflow-hidden">
                <Button
                  type="button"
                  variant={viewMode === "editor" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange("editor")}
                  className={`h-7 gap-1 px-3 ${
                    viewMode === "editor"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  }`}
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span className="text-xs">{t("components.DocumentSidebar.editor", "Editor")}</span>
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "graph" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange("graph")}
                  className={`h-7 gap-1 px-3 ${
                    viewMode === "graph"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  }`}
                >
                  <Network className="h-3.5 w-3.5" />
                  <span className="text-xs">{t("components.DocumentSidebar.graph", "Graph")}</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Document List */}
        <ScrollArea className="flex-1 min-h-0 [&>[data-radix-scroll-area-viewport]]:!overflow-x-hidden">
          <div className="p-2 space-y-1">
            {filteredDocuments.length === 0 ? (
              <div className="group text-center py-12 px-4 text-sidebar-foreground/70 text-sm transition-colors hover:text-primary/80 hover:bg-primary/5 dark:hover:bg-muted/40 rounded-xl border border-dashed border-sidebar-border/30 hover:border-primary/30">
                {searchQuery ? (
                  <>
                    <FileText className="h-10 w-10 mx-auto mb-2 text-sidebar-foreground/50 group-hover:text-primary/70 transition-colors" />
                    <p className="mb-1 font-medium text-foreground/80 group-hover:text-primary transition-colors">{t("components.DocumentSidebar.noDocumentsFound")}</p>
                    <p className="text-xs text-sidebar-foreground/65 group-hover:text-primary/60 transition-colors">{t("components.DocumentSidebar.tryDifferentSearch")}</p>
                  </>
                ) : (
                  <>
                    <FileText className="h-10 w-10 mx-auto mb-2 text-sidebar-foreground/50 group-hover:text-primary/70 transition-colors" />
                    <p className="mb-1 font-medium text-foreground/80 group-hover:text-primary transition-colors">{t("components.DocumentSidebar.noDocumentsYet")}</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleCreateDocument}
                      className="mt-1 h-auto p-0 text-xs text-primary hover:text-primary/90 transition-colors"
                    >
                      {t("components.DocumentSidebar.createFirstDocument")}
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
        <div className="p-3 border-t border-sidebar-border/40 space-y-2 flex-shrink-0">
          <div className="text-xs text-sidebar-foreground/70 px-2">
            <span className="font-medium">
              {showTrash
                ? `${getTrashedDocuments().length} ${getTrashedDocuments().length === 1 ? t("components.DocumentSidebar.item") : t("components.DocumentSidebar.items")}`
                : `${documents.filter(doc => !doc.trashed).length} ${documents.filter(doc => !doc.trashed).length === 1 ? t("components.DocumentSidebar.document") : t("components.DocumentSidebar.documents")}`
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
            {showTrash ? t("components.DocumentSidebar.backToDocuments") : t("components.DocumentSidebar.viewTrash")}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("components.DocumentSidebar.deleteDocumentTitle")}</DialogTitle>
            <DialogDescription>
              {t("components.DocumentSidebar.deleteDocumentDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {t("components.DocumentSidebar.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("components.DocumentSidebar.deletePermanently")}</DialogTitle>
            <DialogDescription>
              {t("components.DocumentSidebar.deletePermanentlyConfirmation")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermanentDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handlePermanentDeleteConfirm}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentUploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
        onUploadSuccess={() => {
          loadDocuments();
        }}
      />
    </>
  );
}
