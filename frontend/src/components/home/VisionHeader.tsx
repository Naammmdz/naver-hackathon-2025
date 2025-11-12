import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useVisionBoardStore, VisionItem } from '@/store/visionBoardStore';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ItemView({ item }: { item: VisionItem }) {
  const update = useVisionBoardStore((s) => s.updateItem);
  const remove = useVisionBoardStore((s) => s.removeItem);
  return (
    <div
      style={{
        transform: `translate(${item.x}px, ${item.y}px) rotate(${item.r ?? 0}deg) scale(${item.s ?? 1})`,
      }}
      className="absolute select-none"
      data-id={item.id}
    >
      <button
        onClick={() => remove(item.id)}
        className="absolute -right-2 -top-2 z-10 hidden rounded-full bg-background/90 p-0.5 text-muted-foreground shadow hover:text-foreground group-hover:block"
        aria-label="remove"
      >
        <X className="h-3 w-3" />
      </button>
      {item.type === 'text' && (
        <div className={`pointer-events-none text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r ${item.color ?? 'from-foreground via-purple-400 to-cyan-400'} bg-clip-text text-transparent`}>
          {item.content}
        </div>
      )}
      {item.type === 'emoji' && (
        <div className="text-4xl md:text-5xl">{item.content}</div>
      )}
      {item.type === 'sticker' && (
        <div className="rounded-md border border-white/10 bg-card/70 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground shadow">{item.content}</div>
      )}
      {item.type === 'image' && typeof item.content === 'string' && (
        <img src={item.content} className="h-12 w-12 rounded-md object-cover shadow" />
      )}
    </div>
  );
}

export function VisionHeader({ workspaceName }: { workspaceName?: string }) {
  const items = useVisionBoardStore((s) => s.items);
  const update = useVisionBoardStore((s) => s.updateItem);
  const addItem = useVisionBoardStore((s) => s.addItem);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.active?.data?.current) return;
    const id = e.active.id as string;
    const delta = e.delta;
    const current = items.find((i) => i.id === id);
    if (!current) return;
    update(id, { x: Math.max(0, (current.x ?? 0) + delta.x), y: Math.max(0, (current.y ?? 0) + delta.y) });
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-background to-background/60 p-4 shadow-sm">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">{workspaceName ?? 'Your space'}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => addItem({ type: 'text', content: 'idea' })} className="gap-1">
            <Plus className="h-4 w-4" />
            Add Note
          </Button>
          <Button size="sm" variant="outline" onClick={() => addItem({ type: 'emoji', content: '✨' })}>Sticker</Button>
        </div>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="relative h-40 w-full cursor-default">
          {items.map((item) => (
            <div key={item.id} id={item.id} data-id={item.id} className="group">
              {/* We rely on CSS transforms and DndContext delta updates */}
              <ItemView item={item} />
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
}