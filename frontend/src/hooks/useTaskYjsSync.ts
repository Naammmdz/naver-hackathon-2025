import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { Task, TaskStatus } from '@/types/task';
import { useTaskStore } from '@/store/taskStore';
import { UpdateTaskInput } from '@/types/task';

interface UseTaskYjsSyncOptions {
  tasksMap: Y.Map<any> | null;
  taskOrdersMap: Y.Map<Y.Array<number>> | null;
  enabled?: boolean;
}

export function useTaskYjsSync({
  tasksMap,
  taskOrdersMap,
  enabled = true
}: UseTaskYjsSyncOptions) {
  const { tasks, updateTask } = useTaskStore();
  const mergeTasksLocal = useTaskStore(s => s.mergeTasksLocal);
  const isSyncingRef = useRef(false);
  const debounceTimer = useRef<number | null>(null);
  const lastTasksRef = useRef<string>(JSON.stringify(tasks));

  // Sync tasks from Zustand to Yjs
  useEffect(() => {
    if (!enabled || !tasksMap || !taskOrdersMap || isSyncingRef.current) {
      return;
    }

    const schedule = () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = window.setTimeout(() => {
        pushToYjs();
      }, 60);
    };

    const pushToYjs = () => {
      if (!tasksMap || !taskOrdersMap) return;
      const currentTasksJson = JSON.stringify(tasks);
      if (currentTasksJson === lastTasksRef.current) {
        return;
      }
      isSyncingRef.current = true;
      try {
        // Update tasks in Yjs Map
        tasks.forEach((task) => {
          const taskKey = task.id;
          const existing = tasksMap.get(taskKey);
          const normalized = {
            ...task,
            dueDate: task.dueDate?.toISOString(),
            createdAt: task.createdAt.toISOString(),
            updatedAt: task.updatedAt.toISOString(),
            assigneeId: task.assigneeId,
          };
          if (!existing || JSON.stringify(existing) !== JSON.stringify(normalized)) {
            tasksMap.set(taskKey, normalized);
          }
        });
        // Update task orders for each column
        const statuses: TaskStatus[] = ['Todo', 'In Progress', 'Done'];
        statuses.forEach((status) => {
          const statusTasks = tasks
            .filter((t) => t.status === status)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const orderArray = taskOrdersMap.get(status);
          const newOrder = statusTasks.map((t) => t.order ?? 0);
          if (orderArray) {
            const currentOrder = orderArray.toArray();
            if (JSON.stringify(currentOrder) !== JSON.stringify(newOrder)) {
              orderArray.delete(0, orderArray.length);
              orderArray.insert(0, newOrder);
            }
          } else {
            const newArray = new Y.Array<number>();
            newArray.insert(0, newOrder);
            taskOrdersMap.set(status, newArray);
          }
        });
        lastTasksRef.current = currentTasksJson;
      } catch (error) {
        console.error('Failed to sync tasks to Yjs:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    schedule();

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [tasks, tasksMap, taskOrdersMap, enabled]);

  // Sync tasks from Yjs to Zustand
  useEffect(() => {
    if (!enabled || !tasksMap) return;

    const handleYjsUpdate = () => {
      if (isSyncingRef.current) return;

      isSyncingRef.current = true;

      try {
        const yjsTasks: Task[] = [];
        tasksMap.forEach((value, key) => {
          try {
            const task: Task = {
              ...value,
              id: key,
              dueDate: value.dueDate ? new Date(value.dueDate) : undefined,
              createdAt: new Date(value.createdAt),
              updatedAt: new Date(value.updatedAt),
              subtasks: value.subtasks || [],
              tags: value.tags || [],
              assigneeId: value.assigneeId,
            };
            yjsTasks.push(task);
          } catch (err) {
            console.warn('Failed to parse task from Yjs:', key, err);
          }
        });

        // Only update if there are actual changes
        const yjsTasksJson = JSON.stringify(yjsTasks);
        if (yjsTasksJson !== lastTasksRef.current) {
          // Merge locally without hitting the API to avoid feedback loops
          mergeTasksLocal(yjsTasks);
          lastTasksRef.current = yjsTasksJson;
        }
      } catch (error) {
        console.error('Failed to sync tasks from Yjs:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    tasksMap.observe(handleYjsUpdate);

    return () => {
      tasksMap.unobserve(handleYjsUpdate);
    };
  }, [tasksMap, enabled, mergeTasksLocal]);

  // Sync task orders from Yjs
  useEffect(() => {
    if (!enabled || !taskOrdersMap) return;

    const handleOrderUpdate = () => {
      if (isSyncingRef.current) return;

      taskOrdersMap.forEach((orderArray, status) => {
        const order = orderArray.toArray();
        // Apply order to tasks
        // This is a simplified version - in production you'd need to map order to task IDs
      });
    };

    taskOrdersMap.observe(handleOrderUpdate);

    return () => {
      taskOrdersMap.unobserve(handleOrderUpdate);
    };
  }, [taskOrdersMap, enabled]);
}

