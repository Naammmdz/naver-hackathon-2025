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
  const isSyncingRef = useRef(false);
  const lastTasksRef = useRef<string>(JSON.stringify(tasks));

  // Sync tasks from Zustand to Yjs
  useEffect(() => {
    if (!enabled || !tasksMap || !taskOrdersMap || isSyncingRef.current) {
      return;
    }

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
        
        if (!existing || JSON.stringify(existing) !== JSON.stringify(task)) {
          tasksMap.set(taskKey, {
            ...task,
            dueDate: task.dueDate?.toISOString(),
            createdAt: task.createdAt.toISOString(),
            updatedAt: task.updatedAt.toISOString(),
          });
        }
      });

      // Update task orders for each column
      const statuses: TaskStatus[] = ['Todo', 'In Progress', 'Done'];
      statuses.forEach((status) => {
        const statusTasks = tasks
          .filter((t) => t.status === status)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        
        const orderArray = taskOrdersMap.get(status);
        if (orderArray) {
          const currentOrder = orderArray.toArray();
          const newOrder = statusTasks.map((t) => {
            const parsedId = parseInt(t.id.split('-').pop() || '0', 16);
            return parsedId || (t.order ?? 0);
          });
          
          if (JSON.stringify(currentOrder) !== JSON.stringify(newOrder)) {
            orderArray.delete(0, orderArray.length);
            orderArray.insert(0, newOrder);
          }
        } else {
          const newArray = new Y.Array<number>();
          const newOrder = statusTasks.map((t) => {
            const parsedId = parseInt(t.id.split('-').pop() || '0', 16);
            return parsedId || (t.order ?? 0);
          });
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
            };
            yjsTasks.push(task);
          } catch (err) {
            console.warn('Failed to parse task from Yjs:', key, err);
          }
        });

        // Only update if there are actual changes
        const yjsTasksJson = JSON.stringify(yjsTasks);
        if (yjsTasksJson !== lastTasksRef.current) {
          // Update tasks in store
          yjsTasks.forEach((task) => {
            const updateInput: UpdateTaskInput = {
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              tags: task.tags,
              subtasks: task.subtasks,
            };
            updateTask(updateInput).catch(err => {
              console.warn('Failed to update task from Yjs:', err);
            });
          });
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
  }, [tasksMap, enabled, updateTask]);

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

