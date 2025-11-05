package com.devflow.common.domain.repository;

import com.devflow.common.domain.entity.Workspace;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BaseWorkspaceRepository extends JpaRepository<Workspace, String> {
}