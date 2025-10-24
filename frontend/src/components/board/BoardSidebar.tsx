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
import { useBoardStore } from '@/store/boardStore';
import {
    Edit2,
    Layers,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';

export default function BoardSidebar() {
  const {
    boards,
    activeBoardId,
    addBoard,
    deleteBoard,
    setActiveBoard,
    updateBoard,
  } = useBoardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const [showNewBoardInput, setShowNewBoardInput] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  const filteredBoards = boards.filter((board) =>
    board.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderBoardItem = (board: any) => {
    return (
      <div key={board.id}>
        <div
          className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all ${
            activeBoardId === board.id 
              ? 'bg-accent text-accent-foreground' 
              : 'hover:bg-accent/50'
          }`}
          onClick={() => setActiveBoard(board.id)}
        >
          {editingId === board.id ? (
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit(board.id);
                } else if (e.key === 'Escape') {
                  handleRenameCancel();
                }
              }}
              onBlur={() => handleRenameSubmit(board.id)}
              autoFocus
              className="h-7 flex-1"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <Layers className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate text-sm">{board.title}</span>
            </>
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
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleRename(board.id, board.title);
                }}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(board.id);
                }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const handleCreateBoard = () => {
    if (newBoardTitle.trim()) {
      addBoard(newBoardTitle.trim());
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
      deleteBoard(boardToDelete);
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
      updateBoard(id, { title: editingTitle.trim() });
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
              Boards
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowNewBoardInput(true)}
              className="h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm bg-muted/50 border-0 focus:bg-background rounded-lg"
            />
          </div>
        </div>

        {/* Board List */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {/* New Board Input */}
            {showNewBoardInput && (
              <div className="px-2 py-2">
                <Input
                  placeholder="Board name..."
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
                  autoFocus
                  className="h-8 text-sm"
                />
              </div>
            )}

            {filteredBoards.length === 0 ? (
              <div className="text-center py-12 px-4 text-muted-foreground text-sm">
                {searchQuery ? (
                  <>
                    <Layers className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="mb-1 font-medium">No boards found</p>
                    <p className="text-xs">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <Layers className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="mb-1 font-medium">No boards yet</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowNewBoardInput(true)}
                      className="mt-1 h-auto p-0 text-xs"
                    >
                      Create your first board
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <>
                {filteredBoards.map(board => renderBoardItem(board))}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t space-y-2 flex-shrink-0">
          <div className="text-xs text-muted-foreground px-2">
            <span className="font-medium">
              {boards.length} {boards.length === 1 ? 'board' : 'boards'}
            </span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Board</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this board? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
