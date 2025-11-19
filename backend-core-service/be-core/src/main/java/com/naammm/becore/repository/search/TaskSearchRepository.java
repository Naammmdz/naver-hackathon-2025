package com.naammm.becore.repository.search;

import com.naammm.becore.search.TaskSearchDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface TaskSearchRepository extends ElasticsearchRepository<TaskSearchDocument, String> {
}

