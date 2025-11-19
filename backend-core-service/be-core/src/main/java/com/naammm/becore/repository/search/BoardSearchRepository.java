package com.naammm.becore.repository.search;

import com.naammm.becore.search.BoardSearchDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface BoardSearchRepository extends ElasticsearchRepository<BoardSearchDocument, String> {
}

