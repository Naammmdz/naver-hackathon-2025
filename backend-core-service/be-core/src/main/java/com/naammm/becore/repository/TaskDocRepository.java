package com.naammm.becore.repository;

import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.TaskDoc;
import com.naammm.becore.entity.TaskDocRelationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskDocRepository extends JpaRepository<TaskDoc, String> {

    List<TaskDoc> findByUserIdOrderByCreatedAtAsc(String userId);

    List<TaskDoc> findByUserIdAndTaskIdOrderByCreatedAtAsc(String userId, String taskId);

    List<TaskDoc> findByUserIdAndDocIdOrderByCreatedAtAsc(String userId, String docId);

    List<TaskDoc> findByUserIdAndTaskIdAndRelationTypeOrderByCreatedAtAsc(String userId, String taskId,
                                                                          TaskDocRelationType relationType);

    Optional<TaskDoc> findByIdAndUserId(String id, String userId);

    void deleteByIdAndUserId(String id, String userId);

    void deleteByUserIdAndTaskId(String userId, String taskId);

    void deleteByUserIdAndDocId(String userId, String docId);

    void deleteByTaskId(String taskId);

    void deleteByDocId(String docId);
}
