package com.naammm.becore.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.Subtask;
import com.naammm.becore.entity.Task;
import com.naammm.becore.entity.TaskPriority;
import com.naammm.becore.entity.TaskStatus;
import com.naammm.becore.entity.WorkspaceMember;
import com.naammm.becore.entity.WorkspaceRole;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.TaskRepository;
import com.naammm.becore.repository.WorkspaceMemberRepository;
import com.naammm.becore.repository.WorkspaceRepository;
import com.naammm.becore.security.UserContext;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class TaskService {

    private final TaskRepository taskRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final RealtimeEventService realtimeEventService;

    public List<Task> getAllTasks() {
        String userId = UserContext.requireUserId();
        return taskRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public Optional<Task> getTaskById(String id) {
        String userId = UserContext.requireUserId();
        return taskRepository.findById(id)
                .filter(task -> canAccessTask(task, userId));
    }

    public List<Task> getTasksByStatus(TaskStatus status) {
        String userId = UserContext.requireUserId();
        return taskRepository.findByUserIdAndStatusOrderByOrderIndexAsc(userId, status);
    }

    public Task createTask(Task task) {
        String userId = UserContext.requireUserId();
        task.setUserId(userId);

        if (StringUtils.hasText(task.getWorkspaceId())) {
            ensureCanModifyWorkspace(task.getWorkspaceId(), userId);
        }

        if (task.getOrderIndex() == null) {
            Integer maxOrder;
            if (StringUtils.hasText(task.getWorkspaceId())) {
                maxOrder = taskRepository.findMaxOrderIndexByWorkspaceIdAndStatus(task.getWorkspaceId(), task.getStatus());
            } else {
                maxOrder = taskRepository.findMaxOrderIndexByUserIdAndStatus(userId, task.getStatus());
            }
            task.setOrderIndex(maxOrder != null ? maxOrder + 1 : 0);
        }

        if (task.getSubtasks() != null) {
            task.getSubtasks().forEach(subtask -> subtask.setTask(task));
        }

        Task savedTask = taskRepository.save(task);
        
        // Broadcast realtime event if task belongs to workspace
        if (StringUtils.hasText(savedTask.getWorkspaceId())) {
            log.info("[Realtime] Broadcasting task created: taskId={}, workspaceId={}", 
                savedTask.getId(), savedTask.getWorkspaceId());
            realtimeEventService.broadcastTaskChange(
                savedTask.getWorkspaceId(), 
                "created", 
                savedTask.getId(), 
                userId
            );
        } else {
            log.debug("[Realtime] Task created without workspace, skipping broadcast: taskId={}", 
                savedTask.getId());
        }
        
        return savedTask;
    }

    public Task updateTask(String id, Task updatedTask) {
        String userId = UserContext.requireUserId();
        Task task = getTaskForCurrentUser(id, userId);

        if (StringUtils.hasText(task.getWorkspaceId())) {
            ensureCanModifyWorkspace(task.getWorkspaceId(), userId);
        }

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

        Task savedTask = taskRepository.save(task);
        
        // Broadcast realtime event
        if (StringUtils.hasText(savedTask.getWorkspaceId())) {
            log.info("[Realtime] Broadcasting task updated: taskId={}, workspaceId={}", 
                savedTask.getId(), savedTask.getWorkspaceId());
            realtimeEventService.broadcastTaskChange(
                savedTask.getWorkspaceId(), 
                "updated", 
                savedTask.getId(), 
                userId
            );
        }
        
        return savedTask;
    }

    public void deleteTask(String id) {
        String userId = UserContext.requireUserId();
        Task task = getTaskForCurrentUser(id, userId);

        if (StringUtils.hasText(task.getWorkspaceId())) {
            ensureCanModifyWorkspace(task.getWorkspaceId(), userId);
        }
        
        String workspaceId = task.getWorkspaceId();
        String taskId = task.getId();
        taskRepository.deleteById(id);
        
        // Broadcast realtime event
        if (StringUtils.hasText(workspaceId)) {
            log.info("[Realtime] Broadcasting task deleted: taskId={}, workspaceId={}", 
                taskId, workspaceId);
            realtimeEventService.broadcastTaskChange(
                workspaceId, 
                "deleted", 
                taskId, 
                userId
            );
        }
    }

    public void moveTask(String id, TaskStatus newStatus) {
        String userId = UserContext.requireUserId();
        Task task = getTaskForCurrentUser(id, userId);

        if (StringUtils.hasText(task.getWorkspaceId())) {
            ensureCanModifyWorkspace(task.getWorkspaceId(), userId);
        }

        task.setStatus(newStatus);
        Integer maxOrder;
        if (StringUtils.hasText(task.getWorkspaceId())) {
            maxOrder = taskRepository.findMaxOrderIndexByWorkspaceIdAndStatus(task.getWorkspaceId(), newStatus);
        } else {
            maxOrder = taskRepository.findMaxOrderIndexByUserIdAndStatus(userId, newStatus);
        }
        task.setOrderIndex(maxOrder != null ? maxOrder + 1 : 0);
        taskRepository.save(task);
    }

    public void reorderTasks(TaskStatus status, int sourceIndex, int destinationIndex) {
        String userId = UserContext.requireUserId();

        // Attempt to reorder tasks across workspaces the user owns or collaborates on.
        List<Task> tasks = taskRepository.findByUserIdAndStatusOrderByOrderIndexAsc(userId, status);

        boolean containsRestrictedTasks = tasks.stream()
            .anyMatch(task -> StringUtils.hasText(task.getWorkspaceId()) && isViewer(task.getWorkspaceId(), userId));
        if (containsRestrictedTasks) {
            throw new SecurityException("Insufficient permissions to reorder tasks in this workspace");
        }

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
        String userId = UserContext.requireUserId();
        Task task = getTaskForCurrentUser(taskId, userId);

        if (StringUtils.hasText(task.getWorkspaceId())) {
            ensureCanModifyWorkspace(task.getWorkspaceId(), userId);
        }

        Subtask subtask = Subtask.builder()
                .title(title)
                .done(false)
                .task(task)
                .build();

        task.getSubtasks().add(subtask);
        taskRepository.save(task);
    }

    public void updateSubtask(String taskId, String subtaskId, String title, Boolean done) {
        String userId = UserContext.requireUserId();
        Task task = getTaskForCurrentUser(taskId, userId);

        if (StringUtils.hasText(task.getWorkspaceId())) {
            ensureCanModifyWorkspace(task.getWorkspaceId(), userId);
        }

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
        String userId = UserContext.requireUserId();
        Task task = getTaskForCurrentUser(taskId, userId);

        if (StringUtils.hasText(task.getWorkspaceId())) {
            ensureCanModifyWorkspace(task.getWorkspaceId(), userId);
        }

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

    // Workspace-based methods with smart auto-detect
    public List<Task> getTasksByWorkspace(String workspaceId) {
        String userId = UserContext.requireUserId();
        
        // Validate workspace exists
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found: " + workspaceId));
        
        // Check if user has access to this workspace
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new SecurityException("Access denied to workspace: " + workspaceId);
        }
        
        // Smart detection: Single member (personal workspace) vs multi-member (shared workspace)
        long memberCount = workspaceMemberRepository.countByWorkspaceId(workspaceId);
        log.info("[TaskService] Workspace {} has {} members, userId={}", workspaceId, memberCount, userId);
        
        if (memberCount <= 1) {
            // Personal workspace mode - show only user's tasks
            log.info("[TaskService] Using PERSONAL mode for workspace {}", workspaceId);
            return taskRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        } else {
            // Shared workspace mode - show all workspace tasks
            log.info("[TaskService] Using SHARED mode for workspace {}", workspaceId);
            return taskRepository.findByWorkspaceIdOrderByUpdatedAtDesc(workspaceId);
        }
    }

    public List<Task> getTasksByWorkspaceAndStatus(String workspaceId, TaskStatus status) {
        String userId = UserContext.requireUserId();
        
        // Validate workspace exists
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found: " + workspaceId));
        
        // Check if user has access to this workspace
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new SecurityException("Access denied to workspace: " + workspaceId);
        }
        
        // Smart detection: Single member vs multi-member
        long memberCount = workspaceMemberRepository.countByWorkspaceId(workspaceId);
        log.info("[TaskService] Workspace {} has {} members, status={}, userId={}", 
                 workspaceId, memberCount, status, userId);
        
        if (memberCount <= 1) {
            // Personal workspace mode
            log.info("[TaskService] Using PERSONAL mode for workspace {} status {}", workspaceId, status);
            return taskRepository.findByUserIdAndStatusOrderByOrderIndexAsc(userId, status);
        } else {
            // Shared workspace mode
            log.info("[TaskService] Using SHARED mode for workspace {} status {}", workspaceId, status);
            return taskRepository.findByWorkspaceIdAndStatusOrderByOrderIndexAsc(workspaceId, status);
        }
    }

    public List<Task> filterTasksByWorkspace(String workspaceId, TaskStatus status, TaskPriority priority, 
                                            String search, LocalDateTime dueDateFrom, LocalDateTime dueDateTo) {
        String userId = UserContext.requireUserId();
        
        // Validate workspace exists
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found: " + workspaceId));
        
        // Check if user has access to this workspace
        if (!workspaceMemberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId)) {
            throw new SecurityException("Access denied to workspace: " + workspaceId);
        }
        
        // Smart detection: Single member vs multi-member
        long memberCount = workspaceMemberRepository.countByWorkspaceId(workspaceId);
        log.info("[TaskService] Filtering workspace {} with {} members, userId={}", 
                 workspaceId, memberCount, userId);
        
        if (memberCount <= 1) {
            // Personal workspace mode - filter user's tasks
            log.info("[TaskService] Using PERSONAL mode for workspace {} filter", workspaceId);
            return taskRepository.findFilteredTasks(
                    userId,
                    status,
                    priority,
                    search,
                    dueDateFrom,
                    dueDateTo
            );
        } else {
            // Shared workspace mode - filter workspace tasks
            log.info("[TaskService] Using SHARED mode for workspace {} filter", workspaceId);
            return taskRepository.findFilteredTasksByWorkspace(
                    workspaceId,
                    status,
                    priority,
                    search,
                    dueDateFrom,
                    dueDateTo
            );
        }
    }

    private Task getTaskForCurrentUser(String id, String userId) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (canAccessTask(task, userId)) {
            return task;
        }

        throw new SecurityException("Access denied to task");
    }

    private boolean canAccessTask(Task task, String userId) {
        if (userId.equals(task.getUserId())) {
            return true;
        }

        if (StringUtils.hasText(task.getWorkspaceId())) {
            return workspaceMemberRepository.existsByWorkspaceIdAndUserId(task.getWorkspaceId(), userId);
        }

        return false;
    }

    private WorkspaceRole requireWorkspaceRole(String workspaceId, String userId) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found: " + workspaceId));

        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new SecurityException("Access denied to workspace: " + workspaceId));
        return member.getRole();
    }

    private void ensureCanModifyWorkspace(String workspaceId, String userId) {
        WorkspaceRole role = requireWorkspaceRole(workspaceId, userId);
        if (role == WorkspaceRole.VIEWER) {
            throw new SecurityException("Viewer role cannot modify workspace content");
        }
    }

    private boolean isViewer(String workspaceId, String userId) {
        WorkspaceRole role = requireWorkspaceRole(workspaceId, userId);
        return role == WorkspaceRole.VIEWER;
    }
}
