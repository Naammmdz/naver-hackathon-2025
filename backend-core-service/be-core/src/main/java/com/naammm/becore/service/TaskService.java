package com.naammm.becore.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.Subtask;
import com.naammm.becore.entity.Task;
import com.naammm.becore.entity.TaskPriority;
import com.naammm.becore.entity.TaskStatus;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.TaskRepository;
import com.naammm.becore.security.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;

    public List<Task> getAllTasks() {
        String userId = UserContext.requireUserId();
        return taskRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public Optional<Task> getTaskById(String id) {
        String userId = UserContext.requireUserId();
        return taskRepository.findByIdAndUserId(id, userId);
    }

    public List<Task> getTasksByStatus(TaskStatus status) {
        String userId = UserContext.requireUserId();
        return taskRepository.findByUserIdAndStatusOrderByOrderIndexAsc(userId, status);
    }

    public Task createTask(Task task) {
        String userId = UserContext.requireUserId();
        task.setUserId(userId);

        if (task.getOrderIndex() == null) {
            Integer maxOrder = taskRepository.findMaxOrderIndexByUserIdAndStatus(userId, task.getStatus());
            task.setOrderIndex(maxOrder != null ? maxOrder + 1 : 0);
        }

        if (task.getSubtasks() != null) {
            task.getSubtasks().forEach(subtask -> subtask.setTask(task));
        }

        return taskRepository.save(task);
    }

    public Task updateTask(String id, Task updatedTask) {
        String userId = UserContext.requireUserId();
        return taskRepository.findByIdAndUserId(id, userId)
                .map(task -> {
                    task.setTitle(updatedTask.getTitle());
                    task.setDescription(updatedTask.getDescription());
                    task.setStatus(updatedTask.getStatus());
                    task.setPriority(updatedTask.getPriority());
                    task.setDueDate(updatedTask.getDueDate());
                    task.setTags(updatedTask.getTags());
                    if (updatedTask.getOrderIndex() != null) {
                        task.setOrderIndex(updatedTask.getOrderIndex());
                    }

                    if (updatedTask.getSubtasks() != null) {
                        task.getSubtasks().clear();
                        updatedTask.getSubtasks().forEach(subtask -> {
                            subtask.setTask(task);
                            task.getSubtasks().add(subtask);
                        });
                    }

                    return taskRepository.save(task);
                })
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    }

    public void deleteTask(String id) {
        String userId = UserContext.requireUserId();
        Task task = taskRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        taskRepository.delete(task);
    }

    public void moveTask(String id, TaskStatus newStatus) {
        String userId = UserContext.requireUserId();
        Task task = taskRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        task.setStatus(newStatus);
        Integer maxOrder = taskRepository.findMaxOrderIndexByUserIdAndStatus(userId, newStatus);
        task.setOrderIndex(maxOrder != null ? maxOrder + 1 : 0);
        taskRepository.save(task);
    }

    public void reorderTasks(TaskStatus status, int sourceIndex, int destinationIndex) {
        String userId = UserContext.requireUserId();
        List<Task> tasks = taskRepository.findByUserIdAndStatusOrderByOrderIndexAsc(userId, status);

        if (sourceIndex < 0 || sourceIndex >= tasks.size() ||
            destinationIndex < 0 || destinationIndex >= tasks.size()) {
            return;
        }

        Task movedTask = tasks.remove(sourceIndex);
        tasks.add(destinationIndex, movedTask);

        for (int i = 0; i < tasks.size(); i++) {
            tasks.get(i).setOrderIndex(i);
        }

        taskRepository.saveAll(tasks);
    }

    public void addSubtask(String taskId, String title) {
        Task task = taskRepository.findByIdAndUserId(taskId, UserContext.requireUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        Subtask subtask = Subtask.builder()
                .title(title)
                .done(false)
                .task(task)
                .build();

        task.getSubtasks().add(subtask);
        taskRepository.save(task);
    }

    public void updateSubtask(String taskId, String subtaskId, String title, Boolean done) {
        Task task = taskRepository.findByIdAndUserId(taskId, UserContext.requireUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        task.getSubtasks().stream()
                .filter(subtask -> subtask.getId().equals(subtaskId))
                .findFirst()
                .ifPresentOrElse(subtask -> {
                    if (title != null) {
                        subtask.setTitle(title);
                    }
                    if (done != null) {
                        subtask.setDone(done);
                    }
                    taskRepository.save(task);
                }, () -> {
                    throw new ResourceNotFoundException("Subtask not found");
                });
    }

    public void deleteSubtask(String taskId, String subtaskId) {
        Task task = taskRepository.findByIdAndUserId(taskId, UserContext.requireUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        boolean removed = task.getSubtasks().removeIf(subtask -> subtask.getId().equals(subtaskId));
        if (!removed) {
            throw new ResourceNotFoundException("Subtask not found");
        }

        taskRepository.save(task);
    }

    public List<Task> filterTasks(TaskStatus status, TaskPriority priority, String search,
                                 LocalDateTime dueDateFrom, LocalDateTime dueDateTo) {
        return taskRepository.findFilteredTasks(
                UserContext.requireUserId(),
                status,
                priority,
                search,
                dueDateFrom,
                dueDateTo
        );
    }
}
