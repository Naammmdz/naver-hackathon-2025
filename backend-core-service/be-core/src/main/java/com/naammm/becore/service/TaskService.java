package com.naammm.becore.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.naammm.becore.config.RedisConfig;
import com.naammm.becore.entity.Subtask;
import com.naammm.becore.entity.Task;
import com.naammm.becore.entity.TaskPriority;
import com.naammm.becore.entity.TaskStatus;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.TaskRepository;
import com.naammm.becore.repository.WorkspaceRepository;
import com.naammm.becore.security.UserContext;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;
    private final WorkspaceRepository workspaceRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final ChannelTopic metadataChannel;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Task> getAllTasks() {
        String userId = UserContext.requireUserId();
        return taskRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public List<Task> getAllTasksInWorkspace(String workspaceId) {
        String userId = UserContext.requireUserId();
        if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
            throw new SecurityException("Access denied");
        }
        return taskRepository.findByWorkspaceIdOrderByUpdatedAtDesc(workspaceId);
    }

    public Optional<Task> getTaskById(String id) {
        String userId = UserContext.requireUserId();
        return taskRepository.findById(id).filter(task -> {
            String workspaceId = task.getWorkspaceId();
            if (workspaceId == null || workspaceId.isBlank()) {
                return task.getUserId().equals(userId);
            }
            return workspaceRepository.userHasAccess(workspaceId, userId);
        });
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
        return taskRepository.findById(id)
                .map(task -> {
                    // Access check: workspace member or personal owner
                    String workspaceId = task.getWorkspaceId();
                    if (workspaceId == null || workspaceId.isBlank()) {
                        if (!task.getUserId().equals(userId)) {
                            throw new SecurityException("Access denied");
                        }
                    } else if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
                        throw new SecurityException("Access denied");
                    }
                    String oldStatus = task.getStatus().name();
                    
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

                    Task saved = taskRepository.save(task);
                    
                    // Publish metadata update to Redis
                    publishMetadataUpdate("task", id, "UPDATE", saved);
                    
                    // If status changed, also publish status change
                    if (!oldStatus.equals(saved.getStatus().name())) {
                        publishMetadataUpdate("task", id, "STATUS_CHANGE", saved.getStatus().name());
                    }
                    
                    return saved;
                })
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    }

    public void deleteTask(String id) {
        String userId = UserContext.requireUserId();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        String workspaceId = task.getWorkspaceId();
        if (workspaceId == null || workspaceId.isBlank()) {
            if (!task.getUserId().equals(userId)) {
                throw new SecurityException("Access denied");
            }
        } else if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
            throw new SecurityException("Access denied");
        }
        taskRepository.delete(task);
    }

    public void moveTask(String id, TaskStatus newStatus) {
        String userId = UserContext.requireUserId();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        String workspaceId = task.getWorkspaceId();
        if (workspaceId == null || workspaceId.isBlank()) {
            if (!task.getUserId().equals(userId)) {
                throw new SecurityException("Access denied");
            }
        } else if (!workspaceRepository.userHasAccess(workspaceId, userId)) {
            throw new SecurityException("Access denied");
        }

        task.setStatus(newStatus);
        Integer maxOrder = (workspaceId == null || workspaceId.isBlank())
                ? taskRepository.findMaxOrderIndexByUserIdAndStatus(userId, newStatus)
                : taskRepository.findMaxOrderIndexByWorkspaceIdAndStatus(workspaceId, newStatus);
        task.setOrderIndex(maxOrder != null ? maxOrder + 1 : 0);
        Task saved = taskRepository.save(task);
        
        // Publish metadata update to Redis
        publishMetadataUpdate("task", id, "MOVE", newStatus.name());
    }

    private void publishMetadataUpdate(String type, String id, String action, Object payload) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", type);
            message.put("id", id);
            message.put("action", action);
            message.put("payload", payload);
            
            String jsonMessage = objectMapper.writeValueAsString(message);
            redisTemplate.convertAndSend(metadataChannel.getTopic(), jsonMessage);
        } catch (JsonProcessingException e) {
            System.err.println("Failed to publish metadata update to Redis: " + e.getMessage());
        }
    }

    public void reorderTasks(TaskStatus status, int sourceIndex, int destinationIndex) {
        String userId = UserContext.requireUserId();
        // Prefer workspace-scoped reorder if user has an active workspace in context (not stored here),
        // fallback to per-user. Since controller doesn't supply workspaceId, we keep existing behavior.
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
