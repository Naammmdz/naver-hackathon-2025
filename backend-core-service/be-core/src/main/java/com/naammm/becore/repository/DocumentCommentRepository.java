package com.naammm.becore.repository;

import java.util.List;

import com.naammm.becore.entity.DocumentComment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentCommentRepository extends JpaRepository<DocumentComment, String> {

    List<DocumentComment> findByDocumentIdOrderByCreatedAtAsc(String documentId);

    List<DocumentComment> findByParentIdOrderByCreatedAtAsc(String parentId);
    
    List<DocumentComment> findByParentId(String parentId);

    void deleteByDocumentId(String documentId);
}

