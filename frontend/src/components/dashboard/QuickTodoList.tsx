import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuickTodoList() {
  const { t } = useTranslation();
  const [todoItems, setTodoItems] = useState<Array<{ id: string; text: string; completed: boolean }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('quick-todo-list');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [newTodoText, setNewTodoText] = useState('');

  const addTodo = () => {
    if (!newTodoText.trim()) return;
    const newTodo = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false,
    };
    const updated = [...todoItems, newTodo];
    setTodoItems(updated);
    localStorage.setItem('quick-todo-list', JSON.stringify(updated));
    setNewTodoText('');
  };

  const toggleTodo = (id: string) => {
    const updated = todoItems.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setTodoItems(updated);
    localStorage.setItem('quick-todo-list', JSON.stringify(updated));
  };

  const deleteTodo = (id: string) => {
    const updated = todoItems.filter(item => item.id !== id);
    setTodoItems(updated);
    localStorage.setItem('quick-todo-list', JSON.stringify(updated));
  };

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* Add Todo Input */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={t('components.QuickTodoList.addTodoPlaceholder')}
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              addTodo();
            }
          }}
          className="text-xs h-7"
        />
        <Button
          size="sm"
          onClick={addTodo}
          className="h-7 px-2 text-xs"
          disabled={!newTodoText.trim()}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Todo List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {todoItems.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-xs">{t('components.QuickTodoList.noTodosYet')}</p>
            <p className="text-[10px] mt-1">{t('components.QuickTodoList.addOneAbove')}</p>
          </div>
        ) : (
          todoItems.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/50 transition-colors group"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                className="h-3 w-3 rounded"
              />
              <span
                className={cn(
                  "flex-1 text-xs",
                  todo.completed && "line-through text-muted-foreground"
                )}
              >
                {todo.text}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteTodo(todo.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
