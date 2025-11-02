package com.naammm.becore.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.naammm.becore.entity.Task;
import com.naammm.becore.entity.TaskPriority;
import com.naammm.becore.entity.TaskStatus;
import com.naammm.becore.service.TaskService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    public ResponseEntity<List<Task>> getAllTasks(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(taskService.getAllTasks());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getTaskById(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId) {
        return taskService.getTaskById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Task>> getTasksByStatus(
            @PathVariable TaskStatus status,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(taskService.getTasksByStatus(status));
    }

    @PostMapping
    public ResponseEntity<Task> createTask(
            @RequestBody Task task,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(taskService.createTask(task));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(
            @PathVariable String id,
            @RequestBody Task task,
            @RequestHeader("X-User-Id") String userId) {
        try {
            return ResponseEntity.ok(taskService.updateTask(id, task));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String userId) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> moveTask(
            @PathVariable String id,
            @RequestBody Map<String, TaskStatus> body,
            @RequestHeader("X-User-Id") String userId) {
        taskService.moveTask(id, body.get("status"));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorderTasks(
            @RequestBody Map<String, Object> body,
            @RequestHeader("X-User-Id") String userId) {
        TaskStatus status = TaskStatus.valueOf((String) body.get("status"));
        int sourceIndex = (Integer) body.get("sourceIndex");
        int destinationIndex = (Integer) body.get("destinationIndex");
        taskService.reorderTasks(status, sourceIndex, destinationIndex);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{taskId}/subtasks")
    public ResponseEntity<Void> addSubtask(
            @PathVariable String taskId,
            @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String userId) {
        taskService.addSubtask(taskId, body.get("title"));
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{taskId}/subtasks/{subtaskId}")
    public ResponseEntity<Void> updateSubtask(
            @PathVariable String taskId,
            @PathVariable String subtaskId,
            @RequestBody Map<String, Object> body,
            @RequestHeader("X-User-Id") String userId) {
        String title = (String) body.get("title");
        Boolean done = (Boolean) body.get("done");
        taskService.updateSubtask(taskId, subtaskId, title, done);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{taskId}/subtasks/{subtaskId}")
    public ResponseEntity<Void> deleteSubtask(
            @PathVariable String taskId,
            @PathVariable String subtaskId,
            @RequestHeader("X-User-Id") String userId) {
        taskService.deleteSubtask(taskId, subtaskId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/filter")
    public ResponseEntity<List<Task>> filterTasks(
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LocalDateTime dueDateFrom,
            @RequestParam(required = false) LocalDateTime dueDateTo,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(taskService.filterTasks(status, priority, search, dueDateFrom, dueDateTo));
    }

    // Workspace-based endpoints
    @GetMapping("/workspace/{workspaceId}")
    public ResponseEntity<List<Task>> getTasksByWorkspace(@PathVariable String workspaceId) {
        return ResponseEntity.ok(taskService.getTasksByWorkspace(workspaceId));
    }

    @GetMapping("/workspace/{workspaceId}/status/{status}")
    public ResponseEntity<List<Task>> getTasksByWorkspaceAndStatus(
            @PathVariable String workspaceId,
            @PathVariable TaskStatus status) {
        return ResponseEntity.ok(taskService.getTasksByWorkspaceAndStatus(workspaceId, status));
    }

    @GetMapping("/workspace/{workspaceId}/filter")
    public ResponseEntity<List<Task>> filterTasksByWorkspace(
            @PathVariable String workspaceId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LocalDateTime dueDateFrom,
            @RequestParam(required = false) LocalDateTime dueDateTo) {
        return ResponseEntity.ok(taskService.filterTasksByWorkspace(workspaceId, status, priority, search, dueDateFrom, dueDateTo));
    }
}