package com.naammm.becore.repository;

import com.naammm.becore.entity.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, String> {
    void deleteByDocumentId(String documentId);
}
