package com.naammm.becore.dto;

import java.time.LocalDate;
import java.util.List;

import com.naammm.becore.entity.TaskPriority;

import lombok.Data;

@Data
public class ParseTaskResponse {
    private Task task;

    @Data
    public static class Task {
        private String title;
        private String description;
        // ISO 8601 local datetime without timezone, e.g. 2025-11-12T09:30
        private String dueAt;
        private TaskPriority priority;
        private List<String> tags;
        private List<String> subtasks;
    }
}


