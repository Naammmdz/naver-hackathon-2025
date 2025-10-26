package com.naammm.becore.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.Subtask;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import com.naammm.becore.entity.Task;
import com.naammm.becore.entity.TaskPriority;
import com.naammm.becore.entity.TaskStatus;
import com.naammm.becore.repository.TaskRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;

    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    public Optional<Task> getTaskById(String id) {
        return taskRepository.findById(id);
    }

    public List<Task> getTasksByStatus(TaskStatus status) {
        return taskRepository.findByStatusOrderByOrderIndexAsc(status);
    }

    public Task createTask(Task task) {
        if (task.getOrderIndex() == null) {
            Integer maxOrder = taskRepository.findMaxOrderIndexByStatus(task.getStatus());
            task.setOrderIndex(maxOrder != null ? maxOrder + 1 : 0);
        }
        return taskRepository.save(task);
    }

    public Task updateTask(String id, Task updatedTask) {
        return taskRepository.findById(id)
                .map(task -> {
                    task.setTitle(updatedTask.getTitle());
                    task.setDescription(updatedTask.getDescription());
                    task.setStatus(updatedTask.getStatus());
                    task.setPriority(updatedTask.getPriority());
                    task.setDueDate(updatedTask.getDueDate());
                    task.setTags(updatedTask.getTags());
                    task.setOrderIndex(updatedTask.getOrderIndex());
                    return taskRepository.save(task);
                })
                .orElseThrow(() -> new RuntimeException("Task not found"));
    }

    public void deleteTask(String id) {
        taskRepository.deleteById(id);
    }

    public void moveTask(String id, TaskStatus newStatus) {
        taskRepository.findById(id).ifPresent(task -> {
            task.setStatus(newStatus);
            // Reorder within the new status
            Integer maxOrder = taskRepository.findMaxOrderIndexByStatus(newStatus);
            task.setOrderIndex(maxOrder != null ? maxOrder + 1 : 0);
            taskRepository.save(task);
        });
    }

    public void reorderTasks(TaskStatus status, int sourceIndex, int destinationIndex) {
        List<Task> tasks = taskRepository.findByStatusOrderByOrderIndexAsc(status);

        if (sourceIndex < 0 || sourceIndex >= tasks.size() ||
            destinationIndex < 0 || destinationIndex >= tasks.size()) {
            return;
        }

        Task movedTask = tasks.remove(sourceIndex);
        tasks.add(destinationIndex, movedTask);

        // Update order indices
        for (int i = 0; i < tasks.size(); i++) {
            tasks.get(i).setOrderIndex(i);
        }

        taskRepository.saveAll(tasks);
    }

    public void addSubtask(String taskId, String title) {
        taskRepository.findById(taskId).ifPresent(task -> {
            Subtask subtask = Subtask.builder()
                    .title(title)
                    .done(false)
                    .task(task)
                    .build();
            task.getSubtasks().add(subtask);
            taskRepository.save(task);
        });
    }

    public void updateSubtask(String taskId, String subtaskId, String title, Boolean done) {
        taskRepository.findById(taskId).ifPresent(task -> {
            task.getSubtasks().stream()
                    .filter(subtask -> subtask.getId().equals(subtaskId))
                    .findFirst()
                    .ifPresent(subtask -> {
                        if (title != null) subtask.setTitle(title);
                        if (done != null) subtask.setDone(done);
                        taskRepository.save(task);
                    });
        });
    }

    public void deleteSubtask(String taskId, String subtaskId) {
        taskRepository.findById(taskId).ifPresent(task -> {
            task.getSubtasks().removeIf(subtask -> subtask.getId().equals(subtaskId));
            taskRepository.save(task);
        });
    }

    public List<Task> filterTasks(TaskStatus status, TaskPriority priority, String search,
                                 LocalDateTime dueDateFrom, LocalDateTime dueDateTo) {
        return taskRepository.findFilteredTasks(status, priority, search, dueDateFrom, dueDateTo);
    }
}