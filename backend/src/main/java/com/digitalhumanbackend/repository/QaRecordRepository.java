package com.digitalhumanbackend.repository;

import com.digitalhumanbackend.model.QaRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QaRecordRepository extends JpaRepository<QaRecord, Long>, JpaSpecificationExecutor<QaRecord> {
    // 自定义查询（如果有需求）
    List<QaRecord> findByClientId(String clientId);
}
