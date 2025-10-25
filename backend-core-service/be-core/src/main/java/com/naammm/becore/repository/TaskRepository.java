package com.naammm.becore.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.naammm.becore.entity.Task;
import com.naammm.becore.entity.TaskStatus;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {

    List<Task> findByStatus(TaskStatus status);

    List<Task> findByStatusOrderByOrderIndexAsc(TaskStatus status);

    @Query("SELECT MAX(t.orderIndex) FROM Task t WHERE t.status = :status")
    Integer findMaxOrderIndexByStatus(@Param("status") TaskStatus status);

    @Query("SELECT t FROM Task t WHERE " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:priority IS NULL OR t.priority = :priority) AND " +
           "(:search IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:dueDateFrom IS NULL OR t.dueDate >= :dueDateFrom) AND " +
           "(:dueDateTo IS NULL OR t.dueDate <= :dueDateTo)")
    List<Task> findFilteredTasks(@Param("status") TaskStatus status,
                                @Param("priority") com.naammm.becore.entity.TaskPriority priority,
                                @Param("search") String search,
                                @Param("dueDateFrom") LocalDateTime dueDateFrom,
                                @Param("dueDateTo") LocalDateTime dueDateTo);
}