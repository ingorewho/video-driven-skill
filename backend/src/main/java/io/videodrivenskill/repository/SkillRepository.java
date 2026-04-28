package io.videodrivenskill.repository;

import io.videodrivenskill.model.SkillRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SkillRepository extends JpaRepository<SkillRecord, String> {
  List<SkillRecord> findAllByOrderByCreatedAtDesc();
}
