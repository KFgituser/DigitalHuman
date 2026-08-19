USE digitalhuman;

ALTER TABLE qa_record
  CHANGE COLUMN `timestamp` created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE qa_record
  ADD COLUMN source_key VARCHAR(64) NULL AFTER id,
  ADD COLUMN request_id VARCHAR(128) NULL AFTER source_key,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD COLUMN deleted_at TIMESTAMP NULL AFTER updated_at,
  ADD COLUMN answer_status VARCHAR(32) NULL AFTER page,
  ADD COLUMN fail_reason TEXT NULL AFTER answer_status,
  ADD COLUMN answer_duration_seconds DECIMAL(10, 3) NULL AFTER fail_reason,
  ADD COLUMN total_tokens BIGINT NULL AFTER answer_duration_seconds,
  ADD COLUMN retrieval_hit BOOLEAN NULL AFTER total_tokens,
  ADD COLUMN source_summary TEXT NULL AFTER retrieval_hit,
  ADD COLUMN raw_payload LONGTEXT NULL AFTER source_summary;

ALTER TABLE qa_record
  MODIFY question TEXT NOT NULL,
  MODIFY answer MEDIUMTEXT NULL,
  MODIFY client_id VARCHAR(255) NULL,
  MODIFY page INT NULL;

SET SQL_SAFE_UPDATES = 0;

UPDATE qa_record
SET source_key = CASE
    WHEN client_id = '1952665052121272320' THEN 'beijing'
    WHEN client_id = '2011260068498116608' THEN 'tangshan'
    ELSE source_key
  END
WHERE source_key IS NULL;

SET SQL_SAFE_UPDATES = 1;

CREATE INDEX idx_qa_record_source_time ON qa_record (source_key, created_at, id);
CREATE INDEX idx_qa_record_client_time ON qa_record (client_id, created_at, id);
CREATE INDEX idx_qa_record_source_updated ON qa_record (source_key, updated_at, id);
CREATE INDEX idx_qa_record_client_updated ON qa_record (client_id, updated_at, id);
CREATE INDEX idx_qa_record_status_time ON qa_record (answer_status, created_at);
