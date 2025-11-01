import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/store/boardStore';
import { Layers, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldBeDark = savedTheme === "dark" || (!savedTheme && systemDark);
      setIsDark(shouldBeDark);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

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
      <div
        className="relative flex h-full min-h-[520px] w-full items-center justify-center overflow-hidden px-6 py-12 transition-colors"
        style={{
          background: isDark
            ? 'linear-gradient(145deg, #0f1117 0%, #111827 55%, #1e293b 100%)'
            : 'linear-gradient(140deg, #f5f3ff 0%, #e0f2fe 45%, #fef3c7 100%)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -left-28 top-16 h-64 w-64 rounded-full blur-3xl mix-blend-screen opacity-45 dark:opacity-75"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(56,189,248,0.55) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(56,189,248,0.35) 0%, transparent 72%)',
            }}
          />
          <div
            className="absolute -right-24 bottom-12 h-72 w-72 rounded-full blur-[120px] mix-blend-screen opacity-40 dark:opacity-70"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(168,85,247,0.55) 0%, transparent 75%)'
                : 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 75%)',
            }}
          />
          <div
            className="absolute left-1/2 top-8 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl mix-blend-screen opacity-35 dark:opacity-55"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(251,191,36,0.45) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)',
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,0.12),_transparent_55%)] dark:bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,0.18),_transparent_55%)]" />

        <div className="relative z-10 flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#38bdf8] via-[#a855f7] to-[#f97316] text-white shadow-lg shadow-pink-500/35">
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
              <Sparkles className="h-4 w-4 text-sky-500 dark:text-sky-300" />
              <span>Tự động lưu từng nét vẽ và đồng bộ với team theo thời gian thực.</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-300" />
              <span>Nhúng icon, link, hình ảnh để kể câu chuyện sản phẩm hấp dẫn.</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-300" />
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
