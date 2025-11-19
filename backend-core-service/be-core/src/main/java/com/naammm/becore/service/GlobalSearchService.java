package com.naammm.becore.service;

import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.MultiMatchQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import com.naammm.becore.dto.search.SearchResponseDto;
import com.naammm.becore.dto.search.SearchResultDto;
import com.naammm.becore.entity.Board;
import com.naammm.becore.entity.Document;
import com.naammm.becore.entity.Task;
import com.naammm.becore.repository.WorkspaceRepository;
import com.naammm.becore.repository.search.BoardSearchRepository;
import com.naammm.becore.repository.search.DocumentSearchRepository;
import com.naammm.becore.repository.search.TaskSearchRepository;
import com.naammm.becore.search.BoardSearchDocument;
import com.naammm.becore.search.DocumentSearchDocument;
import com.naammm.becore.search.SearchType;
import com.naammm.becore.search.TaskSearchDocument;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.HighlightQuery;
import org.springframework.data.elasticsearch.core.query.highlight.Highlight;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightField;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GlobalSearchService {

    private static final List<String> TASK_FIELDS = List.of("title^3", "description^2", "tags", "status", "priority");
    private static final List<String> DOCUMENT_FIELDS = List.of("title^3", "content^2", "summary");
    private static final List<String> BOARD_FIELDS = List.of("title^3", "snapshot");

    private final TaskSearchRepository taskSearchRepository;
    private final DocumentSearchRepository documentSearchRepository;
    private final BoardSearchRepository boardSearchRepository;
    private final ElasticsearchOperations elasticsearchOperations;
    private final WorkspaceRepository workspaceRepository;

    public void indexTask(Task task) {
        if (task == null) {
            return;
        }
        List<String> tags = task.getTags() == null ? Collections.emptyList() : task.getTags();
        TaskSearchDocument document = TaskSearchDocument.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus() != null ? task.getStatus().name() : null)
                .priority(task.getPriority() != null ? task.getPriority().name() : null)
                .dueDate(task.getDueDate() != null ? task.getDueDate().toLocalDate() : null)
                .tags(tags)
                .userId(task.getUserId())
                .workspaceId(task.getWorkspaceId())
                .assigneeId(task.getAssigneeId())
                .createdAt(task.getCreatedAt() != null ? task.getCreatedAt().toLocalDate() : null)
                .updatedAt(task.getUpdatedAt() != null ? task.getUpdatedAt().toLocalDate() : null)
                .build();
        taskSearchRepository.save(document);
    }

    public void deleteTask(String taskId) {
        taskSearchRepository.deleteById(taskId);
    }

    public void indexDocument(Document document) {
        if (document == null) {
            return;
        }
        if (Boolean.TRUE.equals(document.getTrashed())) {
            documentSearchRepository.deleteById(document.getId());
            return;
        }
        DocumentSearchDocument searchDocument = DocumentSearchDocument.builder()
                .id(document.getId())
                .title(document.getTitle())
                .content(document.getContent())
                .summary(extractSummary(document.getContent()))
                .icon(document.getIcon())
                .userId(document.getUserId())
                .workspaceId(document.getWorkspaceId())
                .createdAt(document.getCreatedAt() != null ? document.getCreatedAt().toLocalDate() : null)
                .updatedAt(document.getUpdatedAt() != null ? document.getUpdatedAt().toLocalDate() : null)
                .trashed(document.getTrashed())
                .build();
        documentSearchRepository.save(searchDocument);
    }

    public void deleteDocument(String documentId) {
        documentSearchRepository.deleteById(documentId);
    }

    public void indexBoard(Board board) {
        if (board == null) {
            return;
        }
        BoardSearchDocument searchDocument = BoardSearchDocument.builder()
                .id(board.getId())
                .title(board.getTitle())
                .snapshot(board.getSnapshot())
                .userId(board.getUserId())
                .workspaceId(board.getWorkspaceId())
                .createdAt(board.getCreatedAt() != null ? board.getCreatedAt().toLocalDate() : null)
                .updatedAt(board.getUpdatedAt() != null ? board.getUpdatedAt().toLocalDate() : null)
                .build();
        boardSearchRepository.save(searchDocument);
    }

    public void deleteBoard(String boardId) {
        boardSearchRepository.deleteById(boardId);
    }

    public SearchResponseDto search(String query, SearchType type, String workspaceId, String userId, Pageable pageable) {
        if (!StringUtils.hasText(query)) {
            return SearchResponseDto.builder()
                    .results(Collections.emptyList())
                    .total(0)
                    .tookMs(0)
                    .build();
        }

        validateScope(workspaceId, userId);

        long started = System.currentTimeMillis();
        List<SearchResultDto> results = new ArrayList<>();
        long total = 0;

        Pageable safePageable = pageable == null ? PageRequest.of(0, 10) : pageable;

        if (type == SearchType.ALL || type == SearchType.TASK) {
            SearchHits<TaskSearchDocument> hits = executeTaskSearch(query, workspaceId, userId, safePageable);
            total += hits.getTotalHits();
            results.addAll(mapTaskResults(hits));
        }

        if (type == SearchType.ALL || type == SearchType.DOCUMENT) {
            SearchHits<DocumentSearchDocument> hits = executeDocumentSearch(query, workspaceId, userId, safePageable);
            total += hits.getTotalHits();
            results.addAll(mapDocumentResults(hits));
        }

        if (type == SearchType.ALL || type == SearchType.BOARD) {
            SearchHits<BoardSearchDocument> hits = executeBoardSearch(query, workspaceId, userId, safePageable);
            total += hits.getTotalHits();
            results.addAll(mapBoardResults(hits));
        }

        long tookMs = System.currentTimeMillis() - started;
        return SearchResponseDto.builder()
                .results(results)
                .total(total)
                .tookMs(tookMs)
                .build();
    }

    private SearchHits<TaskSearchDocument> executeTaskSearch(String query, String workspaceId, String userId, Pageable pageable) {
        NativeQuery nativeQuery = buildNativeQuery(query, workspaceId, userId, pageable, TASK_FIELDS);
        return elasticsearchOperations.search(nativeQuery, TaskSearchDocument.class);
    }

    private SearchHits<DocumentSearchDocument> executeDocumentSearch(String query, String workspaceId, String userId, Pageable pageable) {
        NativeQuery nativeQuery = buildNativeQuery(query, workspaceId, userId, pageable, DOCUMENT_FIELDS);
        return elasticsearchOperations.search(nativeQuery, DocumentSearchDocument.class);
    }

    private SearchHits<BoardSearchDocument> executeBoardSearch(String query, String workspaceId, String userId, Pageable pageable) {
        NativeQuery nativeQuery = buildNativeQuery(query, workspaceId, userId, pageable, BOARD_FIELDS);
        return elasticsearchOperations.search(nativeQuery, BoardSearchDocument.class);
    }

    private NativeQuery buildNativeQuery(String query, String workspaceId, String userId, Pageable pageable, List<String> fields) {
        MultiMatchQuery multiMatch = new MultiMatchQuery.Builder()
                .query(query)
                .fields(fields)
                .type(TextQueryType.BestFields)
                .fuzziness("AUTO")
                .build();

        BoolQuery.Builder boolQuery = new BoolQuery.Builder();
        boolQuery.must(multiMatch._toQuery());

        if (StringUtils.hasText(workspaceId)) {
            boolQuery.filter(f -> f.term(t -> t.field("workspaceId").value(workspaceId)));
        } else {
            boolQuery.filter(f -> f.term(t -> t.field("userId").value(userId)));
        }

        Query finalQuery = new Query.Builder()
                .bool(boolQuery.build())
                .build();

        HighlightQuery highlightQuery = buildHighlight(fields);

        return NativeQuery.builder()
                .withQuery(finalQuery)
                .withPageable(pageable)
                .withHighlightQuery(highlightQuery)
                .build();
    }

    private HighlightQuery buildHighlight(List<String> fields) {
        List<HighlightField> highlightFields = fields.stream()
                .map(field -> new HighlightField(field.contains("^") ? field.substring(0, field.indexOf('^')) : field))
                .toList();
        Highlight highlight = new Highlight(highlightFields);
        return new HighlightQuery(highlight, null);
    }

    private List<SearchResultDto> mapTaskResults(SearchHits<TaskSearchDocument> hits) {
        return hits.getSearchHits().stream()
                .map(hit -> {
                    TaskSearchDocument doc = hit.getContent();
                    Map<String, Object> metadata = new HashMap<>();
                    metadata.put("status", doc.getStatus());
                    metadata.put("priority", doc.getPriority());
                    metadata.put("assigneeId", doc.getAssigneeId());
                    return SearchResultDto.builder()
                            .id(doc.getId())
                            .type(SearchType.TASK)
                            .title(doc.getTitle())
                            .snippet(resolveSnippet(hit, List.of("title", "description")))
                            .workspaceId(doc.getWorkspaceId())
                            .userId(doc.getUserId())
                            .updatedAt(doc.getUpdatedAt())
                            .metadata(metadata)
                            .build();
                })
                .toList();
    }

    private List<SearchResultDto> mapDocumentResults(SearchHits<DocumentSearchDocument> hits) {
        return hits.getSearchHits().stream()
                .map(hit -> {
                    DocumentSearchDocument doc = hit.getContent();
                    Map<String, Object> metadata = new HashMap<>();
                    metadata.put("icon", doc.getIcon());
                    return SearchResultDto.builder()
                            .id(doc.getId())
                            .type(SearchType.DOCUMENT)
                            .title(doc.getTitle())
                            .snippet(resolveSnippet(hit, List.of("title", "summary", "content")))
                            .workspaceId(doc.getWorkspaceId())
                            .userId(doc.getUserId())
                            .updatedAt(doc.getUpdatedAt())
                            .metadata(metadata)
                            .build();
                })
                .toList();
    }

    private List<SearchResultDto> mapBoardResults(SearchHits<BoardSearchDocument> hits) {
        return hits.getSearchHits().stream()
                .map(hit -> {
                    BoardSearchDocument doc = hit.getContent();
                    return SearchResultDto.builder()
                            .id(doc.getId())
                            .type(SearchType.BOARD)
                            .title(doc.getTitle())
                            .snippet(resolveSnippet(hit, List.of("title", "snapshot")))
                            .workspaceId(doc.getWorkspaceId())
                            .userId(doc.getUserId())
                            .updatedAt(doc.getUpdatedAt())
                            .metadata(Collections.emptyMap())
                            .build();
                })
                .toList();
    }

    private String resolveSnippet(SearchHit<?> hit, List<String> fields) {
        for (String field : fields) {
            String normalized = field.contains("^") ? field.substring(0, field.indexOf('^')) : field;
            List<String> highlights = hit.getHighlightField(normalized);
            if (highlights != null && !highlights.isEmpty()) {
                return highlights.getFirst();
            }
        }
        Object content = hit.getContent();
        if (content instanceof TaskSearchDocument task) {
            return defaultSnippet(task.getDescription());
        }
        if (content instanceof DocumentSearchDocument doc) {
            return defaultSnippet(doc.getSummary());
        }
        if (content instanceof BoardSearchDocument board) {
            return defaultSnippet(board.getSnapshot());
        }
        return "";
    }

    private String defaultSnippet(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String sanitized = value.replaceAll("\\s+", " ").trim();
        return sanitized.length() > 180 ? sanitized.substring(0, 177) + "…" : sanitized;
    }

    private String extractSummary(String content) {
        if (!StringUtils.hasText(content)) {
            return "";
        }
        String sanitized = content.replaceAll("\\<.*?\\>", "").replaceAll("\\s+", " ").trim();
        return sanitized.length() > 400 ? sanitized.substring(0, 397) + "…" : sanitized;
    }

    private void validateScope(String workspaceId, String userId) {
        if (StringUtils.hasText(workspaceId) && !workspaceRepository.userHasAccess(workspaceId, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User không có quyền truy cập workspace này");
        }
    }

}

