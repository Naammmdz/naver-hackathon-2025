package com.naammm.becore.repository;

import java.util.List;

import com.naammm.becore.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentRepository extends JpaRepository<Document, String> {

    List<Document> findByTrashedFalse();

    List<Document> findByParentIdAndTrashedFalse(String parentId);

    List<Document> findByTrashedTrue();

    @Query("SELECT d FROM Document d WHERE d.trashed = false AND " +
           "(LOWER(d.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(d.content) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Document> searchDocuments(@Param("search") String search);
}