package com.naammm.becore.search;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.DateFormat;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.time.LocalDate;

@Document(indexName = "boards")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardSearchDocument {

    @Id
    private String id;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String title;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String snapshot;

    @Field(type = FieldType.Keyword)
    private String userId;

    @Field(type = FieldType.Keyword)
    private String workspaceId;

    @Field(type = FieldType.Date, format = DateFormat.date_optional_time)
    private LocalDate createdAt;

    @Field(type = FieldType.Date, format = DateFormat.date_optional_time)
    private LocalDate updatedAt;
}

