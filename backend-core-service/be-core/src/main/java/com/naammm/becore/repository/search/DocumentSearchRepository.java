package com.naammm.becore.repository.search;

import com.naammm.becore.search.DocumentSearchDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface DocumentSearchRepository extends ElasticsearchRepository<DocumentSearchDocument, String> {
}

