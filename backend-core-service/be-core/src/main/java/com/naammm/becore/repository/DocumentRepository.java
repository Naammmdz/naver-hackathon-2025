package com.naammm.becore.repository;

import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentRepository extends JpaRepository<Document, String> {

    List<Document> findByUserIdAndTrashedFalseOrderByUpdatedAtDesc(String userId);

    List<Document> findByUserIdAndParentIdAndTrashedFalseOrderByUpdatedAtDesc(String userId, String parentId);

    List<Document> findByUserIdAndTrashedTrueOrderByUpdatedAtDesc(String userId);

    Optional<Document> findByIdAndUserId(String id, String userId);

    void deleteByIdAndUserId(String id, String userId);

    @Query("SELECT d FROM Document d WHERE d.userId = :userId AND d.trashed = false AND " +
           "(LOWER(d.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(d.content) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Document> searchDocuments(@Param("userId") String userId, @Param("search") String search);
}
