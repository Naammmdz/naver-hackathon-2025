package com.naammm.becore.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import com.naammm.becore.entity.TaskDoc;
import com.naammm.becore.entity.TaskDocRelationType;
import com.naammm.becore.repository.TaskDocRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskDocService {

    private final TaskDocRepository taskDocRepository;

    public List<TaskDoc> getAllTaskDocs() {
        return taskDocRepository.findAll();
    }

    public Optional<TaskDoc> getTaskDocById(String id) {
        return taskDocRepository.findById(id);
    }

    public List<TaskDoc> getTaskDocsByTaskId(String taskId) {
        return taskDocRepository.findByTaskId(taskId);
    }

    public List<TaskDoc> getTaskDocsByDocId(String docId) {
        return taskDocRepository.findByDocId(docId);
    }

    public List<TaskDoc> getTaskDocsByTaskIdAndRelationType(String taskId, TaskDocRelationType relationType) {
        return taskDocRepository.findByTaskIdAndRelationType(taskId, relationType);
    }

    public TaskDoc createTaskDoc(TaskDoc taskDoc) {
        return taskDocRepository.save(taskDoc);
    }

    public TaskDoc updateTaskDoc(String id, TaskDoc updatedTaskDoc) {
        return taskDocRepository.findById(id)
                .map(taskDoc -> {
                    taskDoc.setRelationType(updatedTaskDoc.getRelationType());
                    taskDoc.setNote(updatedTaskDoc.getNote());
                    taskDoc.setCreatedBy(updatedTaskDoc.getCreatedBy());
                    return taskDocRepository.save(taskDoc);
                })
                .orElseThrow(() -> new RuntimeException("TaskDoc not found"));
    }

    public void deleteTaskDoc(String id) {
        taskDocRepository.deleteById(id);
    }

    public void deleteTaskDocsByTaskId(String taskId) {
        taskDocRepository.deleteByTaskId(taskId);
    }

    public void deleteTaskDocsByDocId(String docId) {
        taskDocRepository.deleteByDocId(docId);
    }
}