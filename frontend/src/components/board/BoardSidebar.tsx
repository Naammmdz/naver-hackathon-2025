import { Button } from '@/components/ui/button';
import { SidebarItem } from '@/components/layout/SidebarItem';
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
import { useBoardStore } from '@/store/boardStore';
import type { Board } from '@/types/board';
import {
  Edit2,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  ChevronLeft,
} from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

const sidebarSurfaceStyle: CSSProperties = {
  background: 'linear-gradient(180deg, color-mix(in oklch, var(--sidebar) 98%, transparent) 0%, color-mix(in oklch, var(--sidebar) 88%, transparent) 100%)',
  borderColor: 'color-mix(in oklch, var(--sidebar-border) 80%, transparent)',
  boxShadow: '0 20px 45px color-mix(in oklch, var(--shadow-color) 12%, transparent)',
};

export default function BoardSidebar({
  onCollapse,
}: {
  onCollapse?: () => void;
}) {
  const { t } = useTranslation();
  const {
    boards,
    activeBoardId,
    addBoard,
    deleteBoard,
    setActiveBoard,
    updateBoard,
    isLoading,
    error,
  } = useBoardStore((state) => ({
    boards: state.boards,
    activeBoardId: state.activeBoardId,
    addBoard: state.addBoard,
    deleteBoard: state.deleteBoard,
    setActiveBoard: state.setActiveBoard,
    updateBoard: state.updateBoard,
    isLoading: state.isLoading,
    error: state.error,
  }));

  // Filter boards by active workspace
  const workspaceFilteredBoards = useWorkspaceFilter(boards);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const [showNewBoardInput, setShowNewBoardInput] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  // Apply workspace filter first, then search filter
  const filteredBoards = useMemo(
    () =>
      workspaceFilteredBoards.filter((board) => board.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [workspaceFilteredBoards, searchQuery],
  );

  const renderBoardItem = (board: Board) => {
    const actions = (
      <>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleRename(board.id, board.title);
          }}
        >
          <Edit2 className="h-4 w-4 mr-2" />
          {t('components.BoardSidebar.rename')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick(board.id);
          }}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('components.BoardSidebar.delete')}
        </DropdownMenuItem>
      </>
    );

    return (
      <div key={board.id}>
        <SidebarItem
          title={board.title}
          isActive={activeBoardId === board.id}
          isExpanded={false} // Boards don't have children/expansion logic yet
          level={0}
          onToggleExpand={(e) => e.stopPropagation()} // No expansion for now
          onClick={() => setActiveBoard(board.id)}
          isEditing={editingId === board.id}
          editingValue={editingTitle}
          onEditChange={setEditingTitle}
          onEditSubmit={() => handleRenameSubmit(board.id)}
          onEditCancel={handleRenameCancel}
          actions={actions}
          icon={<Layers className="h-4 w-4 flex-shrink-0 text-sidebar-foreground/60 transition-colors group-hover:text-primary dark:group-hover:text-sidebar-foreground" />}
        />
      </div>
    );
  };

  const handleCreateBoard = () => {
    if (newBoardTitle.trim()) {
      void addBoard(newBoardTitle.trim());
      setNewBoardTitle('');
      setShowNewBoardInput(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setBoardToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (boardToDelete) {
      void deleteBoard(boardToDelete);
      setBoardToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleRenameSubmit = (id: string) => {
    if (editingTitle.trim()) {
      void updateBoard(id, { title: editingTitle.trim() });
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
              {t('components.BoardSidebar.headerTitle')}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowNewBoardInput(true)}
                className="h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground transition-colors"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
              </Button>
              {onCollapse && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 border border-sidebar-border/50 rounded-full hover:border-primary/50 hover:text-primary"
                  onClick={onCollapse}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">{t('components.BoardView.hideSidebarTitle')}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/60" />
            <Input
              placeholder={t('components.BoardSidebar.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm bg-sidebar/40 border border-transparent focus-visible:ring-sidebar-ring/30 rounded-lg"
            />
            {error && (
              <p className="mt-2 text-xs text-destructive">{error}</p>
            )}
          </div>
        </div>

        {/* Board List */}
        <ScrollArea className="flex-1 min-h-0 [&>[data-radix-scroll-area-viewport]]:!overflow-x-hidden">
          <div className="p-2 space-y-1">
            {/* New Board Input */}
            {showNewBoardInput && (
              <div className="px-2 py-2">
                <Input
                  placeholder={t('components.BoardSidebar.newBoardPlaceholder')}
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateBoard();
                    } else if (e.key === 'Escape') {
                      setShowNewBoardInput(false);
                      setNewBoardTitle('');
                    }
                  }}
                  onBlur={() => {
                    if (newBoardTitle.trim()) {
                      handleCreateBoard();
                    } else {
                      setShowNewBoardInput(false);
                    }
                  }}
                  autoFocus
                  className="h-8 text-sm"
                  disabled={isLoading}
                />
              </div>
            )}

            {isLoading && boards.length === 0 ? (
              <div className="text-center py-12 px-4 text-sidebar-foreground/70 text-sm">
                {t('components.BoardSidebar.loadingBoards')}
              </div>
            ) : filteredBoards.length === 0 ? (
              <div className="text-center py-12 px-4 text-sidebar-foreground/70 text-sm">
                {searchQuery ? (
                  <>
                    <Layers className="h-10 w-10 mx-auto mb-2 text-sidebar-foreground/50" />
                    <p className="mb-1 font-medium">{t('components.BoardSidebar.noBoardsFound')}</p>
                    <p className="text-xs">{t('components.BoardSidebar.tryDifferentSearch')}</p>
                  </>
                ) : (
                  <>
                    <Layers className="h-10 w-10 mx-auto mb-2 text-sidebar-foreground/50" />
                    <p className="mb-1 font-medium">{t('components.BoardSidebar.noBoardsYet')}</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowNewBoardInput(true)}
                      className="mt-1 h-auto p-0 text-xs"
                      disabled={isLoading}
                    >
                      {t('components.BoardSidebar.createFirstBoard')}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              filteredBoards.map((board) => renderBoardItem(board))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border/40 space-y-2 flex-shrink-0">
          <div className="text-xs text-sidebar-foreground/70 px-2">
            <span className="font-medium">
              {boards.length} {boards.length === 1 ? t('components.BoardSidebar.boardSingular') : t('components.BoardSidebar.boardPlural')}
            </span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('components.BoardSidebar.deleteBoardTitle')}</DialogTitle>
            <DialogDescription>
              {t('components.BoardSidebar.deleteBoardDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('components.BoardSidebar.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              {t('components.BoardSidebar.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
