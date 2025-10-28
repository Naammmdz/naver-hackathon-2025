package com.naammm.becore.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.naammm.becore.entity.Board;

@Repository
public interface BoardRepository extends JpaRepository<Board, String> {
}
