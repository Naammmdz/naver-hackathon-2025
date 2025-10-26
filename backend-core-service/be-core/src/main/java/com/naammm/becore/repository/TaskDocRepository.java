package com.naammm.becore.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.naammm.becore.entity.TaskDoc;
import com.naammm.becore.entity.TaskDocRelationType;

@Repository
public interface TaskDocRepository extends JpaRepository<TaskDoc, String> {

    List<TaskDoc> findByTaskId(String taskId);

    List<TaskDoc> findByDocId(String docId);

    List<TaskDoc> findByTaskIdAndRelationType(String taskId, TaskDocRelationType relationType);

    void deleteByTaskId(String taskId);

    void deleteByDocId(String docId);
}