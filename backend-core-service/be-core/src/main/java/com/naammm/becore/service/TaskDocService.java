package com.naammm.becore.service;

import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.TaskDoc;
import com.naammm.becore.entity.TaskDocRelationType;
import com.naammm.becore.exception.ResourceNotFoundException;
import com.naammm.becore.repository.DocumentRepository;
import com.naammm.becore.repository.TaskDocRepository;
import com.naammm.becore.repository.TaskRepository;
import com.naammm.becore.security.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskDocService {

    private final TaskDocRepository taskDocRepository;
    private final TaskRepository taskRepository;
    private final DocumentRepository documentRepository;

    public List<TaskDoc> getAllTaskDocs() {
        return taskDocRepository.findByUserIdOrderByCreatedAtAsc(UserContext.requireUserId());
    }

    public Optional<TaskDoc> getTaskDocById(String id) {
        return taskDocRepository.findByIdAndUserId(id, UserContext.requireUserId());
    }

    public List<TaskDoc> getTaskDocsByTaskId(String taskId) {
        String userId = UserContext.requireUserId();
        ensureTaskOwnership(taskId, userId);
        return taskDocRepository.findByUserIdAndTaskIdOrderByCreatedAtAsc(userId, taskId);
    }

    public List<TaskDoc> getTaskDocsByDocId(String docId) {
        String userId = UserContext.requireUserId();
        ensureDocumentOwnership(docId, userId);
        return taskDocRepository.findByUserIdAndDocIdOrderByCreatedAtAsc(userId, docId);
    }

    public List<TaskDoc> getTaskDocsByTaskIdAndRelationType(String taskId, TaskDocRelationType relationType) {
        String userId = UserContext.requireUserId();
        ensureTaskOwnership(taskId, userId);
        return taskDocRepository.findByUserIdAndTaskIdAndRelationTypeOrderByCreatedAtAsc(userId, taskId, relationType);
    }

    public TaskDoc createTaskDoc(TaskDoc taskDoc) {
        String userId = UserContext.requireUserId();
        ensureTaskOwnership(taskDoc.getTaskId(), userId);
        ensureDocumentOwnership(taskDoc.getDocId(), userId);

        taskDoc.setUserId(userId);
        if (!StringUtils.hasText(taskDoc.getCreatedBy())) {
            taskDoc.setCreatedBy(userId);
        }
        return taskDocRepository.save(taskDoc);
    }

    public TaskDoc updateTaskDoc(String id, TaskDoc updatedTaskDoc) {
        String userId = UserContext.requireUserId();
        return taskDocRepository.findByIdAndUserId(id, userId)
                .map(taskDoc -> {
                    if (updatedTaskDoc.getTaskId() != null && !updatedTaskDoc.getTaskId().equals(taskDoc.getTaskId())) {
                        ensureTaskOwnership(updatedTaskDoc.getTaskId(), userId);
                        taskDoc.setTaskId(updatedTaskDoc.getTaskId());
                    }
                    if (updatedTaskDoc.getDocId() != null && !updatedTaskDoc.getDocId().equals(taskDoc.getDocId())) {
                        ensureDocumentOwnership(updatedTaskDoc.getDocId(), userId);
                        taskDoc.setDocId(updatedTaskDoc.getDocId());
                    }
                    if (updatedTaskDoc.getRelationType() != null) {
                        taskDoc.setRelationType(updatedTaskDoc.getRelationType());
                    }
                    taskDoc.setNote(updatedTaskDoc.getNote());
                    if (StringUtils.hasText(updatedTaskDoc.getCreatedBy())) {
                        taskDoc.setCreatedBy(updatedTaskDoc.getCreatedBy());
                    }
                    return taskDocRepository.save(taskDoc);
                })
                .orElseThrow(() -> new ResourceNotFoundException("Task document relation not found"));
    }

    public void deleteTaskDoc(String id) {
        String userId = UserContext.requireUserId();
        TaskDoc taskDoc = taskDocRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task document relation not found"));
        taskDocRepository.delete(taskDoc);
    }

    public void deleteTaskDocsByTaskId(String taskId) {
        String userId = UserContext.requireUserId();
        ensureTaskOwnership(taskId, userId);
        taskDocRepository.deleteByUserIdAndTaskId(userId, taskId);
    }

    public void deleteTaskDocsByDocId(String docId) {
        String userId = UserContext.requireUserId();
        ensureDocumentOwnership(docId, userId);
        taskDocRepository.deleteByUserIdAndDocId(userId, docId);
    }

    private void ensureTaskOwnership(String taskId, String userId) {
        if (taskId == null) {
            throw new ResourceNotFoundException("Task identifier is required");
        }
        taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    }

    private void ensureDocumentOwnership(String documentId, String userId) {
        if (documentId == null) {
            throw new ResourceNotFoundException("Document identifier is required");
        }
        documentRepository.findByIdAndUserId(documentId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
    }
}
