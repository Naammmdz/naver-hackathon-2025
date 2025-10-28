import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/store/boardStore';
import { Layers, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { Canvas } from './Canvas';

export function CanvasContainer() {
  const {
    boards,
    activeBoardId,
    initialize,
    isInitialized,
    isLoading,
    error,
    addBoard,
    setActiveBoard,
  } = useBoardStore((state) => ({
    boards: state.boards,
    activeBoardId: state.activeBoardId,
    initialize: state.initialize,
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    error: state.error,
    addBoard: state.addBoard,
    setActiveBoard: state.setActiveBoard,
  }));

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (boards.length > 0 && !activeBoardId) {
      setActiveBoard(boards[0].id);
    }
  }, [activeBoardId, boards, isInitialized, setActiveBoard]);

  if (!isInitialized || (isLoading && boards.length === 0)) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  }

  if (error && boards.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-sm text-destructive">
        <p>{error}</p>
        <Button onClick={() => void initialize()} size="sm" disabled={isLoading}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.25),_transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(168,85,247,0.15),_transparent_50%)] dark:bg-[radial-gradient(circle_at_bottom,_rgba(124,58,237,0.2),_transparent_50%)]" />

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-border/60 bg-background/85 px-8 py-14 text-center shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 via-sky-400/60 to-purple-400/70 text-primary-foreground shadow-lg shadow-primary/40">
            <Layers className="h-8 w-8" />
          </span>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Khởi tạo không gian sáng tạo</h2>
            <p className="text-sm leading-relaxed text-muted-foreground/80">
              Tập hợp ý tưởng, sơ đồ sản phẩm và bản phác thảo chung trên cùng một bảng.
              Tạo board đầu tiên để bắt đầu cộng tác trực quan.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground/75">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Tự động lưu từng nét vẽ và đồng bộ với team theo thời gian thực.</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Nhúng icon, link, hình ảnh để kể câu chuyện sản phẩm hấp dẫn.</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Kéo thả khối, sticky note và khung để tổ chức ý tưởng dễ dàng.</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button
              onClick={() => void addBoard('Board đầu tiên')}
              size="lg"
              className="gap-2"
              disabled={isLoading}
            >
              <Sparkles className="h-4 w-4" />
              Tạo board mới
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              disabled
            >
              <Layers className="h-4 w-4" />
              Xem board mẫu
            </Button>
          </div>

          <p className="text-xs text-muted-foreground/70">
            Mẹo: giữ phím <span className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">Space</span> để pan nhanh khi di chuyển trên canvas.
          </p>
        </div>
      </div>
    );
  }

  return <Canvas />;
}
