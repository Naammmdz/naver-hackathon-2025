package com.naammm.becore.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.naammm.becore.entity.Task;
import com.naammm.becore.entity.TaskPriority;
import com.naammm.becore.entity.TaskStatus;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {

    List<Task> findByUserIdOrderByUpdatedAtDesc(String userId);

    List<Task> findByUserIdAndStatusOrderByOrderIndexAsc(String userId, TaskStatus status);

    Optional<Task> findByIdAndUserId(String id, String userId);

    @Query("SELECT MAX(t.orderIndex) FROM Task t WHERE t.userId = :userId AND t.status = :status")
    Integer findMaxOrderIndexByUserIdAndStatus(@Param("userId") String userId, @Param("status") TaskStatus status);

    void deleteByIdAndUserId(String id, String userId);

    @Query("SELECT t FROM Task t WHERE " +
           "t.userId = :userId AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:priority IS NULL OR t.priority = :priority) AND " +
           "(:search IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:dueDateFrom IS NULL OR t.dueDate >= :dueDateFrom) AND " +
           "(:dueDateTo IS NULL OR t.dueDate <= :dueDateTo)")
    List<Task> findFilteredTasks(@Param("userId") String userId,
                                 @Param("status") TaskStatus status,
                                 @Param("priority") TaskPriority priority,
                                 @Param("search") String search,
                                 @Param("dueDateFrom") LocalDateTime dueDateFrom,
                                 @Param("dueDateTo") LocalDateTime dueDateTo);
}
