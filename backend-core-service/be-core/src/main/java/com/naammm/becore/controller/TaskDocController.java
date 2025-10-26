package com.naammm.becore.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import lombok.RequiredArgsConstructor;
import com.naammm.becore.entity.TaskDoc;
import com.naammm.becore.entity.TaskDocRelationType;
import com.naammm.becore.service.TaskDocService;

@RestController
@RequestMapping("/api/task-docs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TaskDocController {

    private final TaskDocService taskDocService;

    @GetMapping
    public ResponseEntity<List<TaskDoc>> getAllTaskDocs() {
        return ResponseEntity.ok(taskDocService.getAllTaskDocs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskDoc> getTaskDocById(@PathVariable String id) {
        return taskDocService.getTaskDocById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<TaskDoc>> getTaskDocsByTaskId(@PathVariable String taskId) {
        return ResponseEntity.ok(taskDocService.getTaskDocsByTaskId(taskId));
    }

    @GetMapping("/document/{docId}")
    public ResponseEntity<List<TaskDoc>> getTaskDocsByDocId(@PathVariable String docId) {
        return ResponseEntity.ok(taskDocService.getTaskDocsByDocId(docId));
    }

    @GetMapping("/task/{taskId}/relation/{relationType}")
    public ResponseEntity<List<TaskDoc>> getTaskDocsByTaskIdAndRelationType(
            @PathVariable String taskId, @PathVariable TaskDocRelationType relationType) {
        return ResponseEntity.ok(taskDocService.getTaskDocsByTaskIdAndRelationType(taskId, relationType));
    }

    @PostMapping
    public ResponseEntity<TaskDoc> createTaskDoc(@RequestBody TaskDoc taskDoc) {
        return ResponseEntity.ok(taskDocService.createTaskDoc(taskDoc));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskDoc> updateTaskDoc(@PathVariable String id, @RequestBody TaskDoc taskDoc) {
        try {
            return ResponseEntity.ok(taskDocService.updateTaskDoc(id, taskDoc));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTaskDoc(@PathVariable String id) {
        taskDocService.deleteTaskDoc(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/task/{taskId}")
    public ResponseEntity<Void> deleteTaskDocsByTaskId(@PathVariable String taskId) {
        taskDocService.deleteTaskDocsByTaskId(taskId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/document/{docId}")
    public ResponseEntity<Void> deleteTaskDocsByDocId(@PathVariable String docId) {
        taskDocService.deleteTaskDocsByDocId(docId);
        return ResponseEntity.noContent().build();
    }
}