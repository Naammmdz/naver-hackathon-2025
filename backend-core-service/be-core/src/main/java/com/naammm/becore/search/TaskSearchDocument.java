package com.naammm.becore.search;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.time.LocalDateTime;
import java.util.List;

@Document(indexName = "tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskSearchDocument {

    @Id
    private String id;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String title;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String description;

    @Field(type = FieldType.Keyword)
    private String status;

    @Field(type = FieldType.Keyword)
    private String priority;

    @Field(type = FieldType.Date)
    private LocalDateTime dueDate;

    @Field(type = FieldType.Keyword)
    private List<String> tags;

    @Field(type = FieldType.Keyword)
    private String userId;

    @Field(type = FieldType.Keyword)
    private String workspaceId;

    @Field(type = FieldType.Keyword)
    private String assigneeId;

    @Field(type = FieldType.Date)
    private LocalDateTime createdAt;

    @Field(type = FieldType.Date)
    private LocalDateTime updatedAt;
}
