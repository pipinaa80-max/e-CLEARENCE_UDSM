package com.UDSM.BACKEND.Repository;

import com.UDSM.BACKEND.Model.ProjectSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectSettingRepository extends JpaRepository<ProjectSetting, String> {
}
