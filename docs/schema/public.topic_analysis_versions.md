# public.topic_analysis_versions

## Description

トピック解析のバージョン管理（議案または議題ごと）

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | uuid | gen_random_uuid() | false | [public.topic_analysis_classifications](public.topic_analysis_classifications.md) [public.topic_analysis_topics](public.topic_analysis_topics.md) |  |  |
| bill_id | uuid |  | true |  | [public.bills](public.bills.md) | 対象議案ID（議案の分析のとき） |
| version | integer |  | false |  |  | バージョン番号（議案・議題ごとにインクリメント） |
| status | text | 'pending'::text | false |  |  | 解析ステータス: pending, running, completed, failed |
| summary_md | text |  | true |  |  | 全体サマリ（markdown形式） |
| intermediate_results | jsonb |  | true |  |  | 中間結果（デバッグ・参照用） |
| error_message | text |  | true |  |  | エラー時のメッセージ |
| created_at | timestamp with time zone | now() | false |  |  |  |
| updated_at | timestamp with time zone | now() | false |  |  |  |
| current_step | text |  | true |  |  | 現在のステップ |
| started_at | timestamp with time zone |  | true |  |  | 開始日時 |
| completed_at | timestamp with time zone |  | true |  |  | 完了日時 |
| phase_data | jsonb |  | true |  |  | フェーズ間データ受け渡し用 |
| interview_topic_id | uuid |  | true |  | [public.interview_topics](public.interview_topics.md) | 対象議題ID（議題の分析のとき） |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| topic_analysis_versions_status_check | CHECK | CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text]))) |
| topic_analysis_versions_subject_exactly_one | CHECK | CHECK ((num_nonnulls(bill_id, interview_topic_id) = 1)) |
| topic_analysis_versions_bill_id_fkey | FOREIGN KEY | FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE |
| topic_analysis_versions_bill_id_version_key | UNIQUE | UNIQUE (bill_id, version) |
| topic_analysis_versions_pkey | PRIMARY KEY | PRIMARY KEY (id) |
| topic_analysis_versions_interview_topic_id_fkey | FOREIGN KEY | FOREIGN KEY (interview_topic_id) REFERENCES interview_topics(id) ON DELETE CASCADE |
| topic_analysis_versions_interview_topic_id_version_key | UNIQUE | UNIQUE (interview_topic_id, version) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| topic_analysis_versions_bill_id_version_key | CREATE UNIQUE INDEX topic_analysis_versions_bill_id_version_key ON public.topic_analysis_versions USING btree (bill_id, version) |
| topic_analysis_versions_pkey | CREATE UNIQUE INDEX topic_analysis_versions_pkey ON public.topic_analysis_versions USING btree (id) |
| idx_topic_analysis_versions_bill_id | CREATE INDEX idx_topic_analysis_versions_bill_id ON public.topic_analysis_versions USING btree (bill_id) |
| topic_analysis_versions_interview_topic_id_version_key | CREATE UNIQUE INDEX topic_analysis_versions_interview_topic_id_version_key ON public.topic_analysis_versions USING btree (interview_topic_id, version) |

## Triggers

| Name | Definition |
| ---- | ---------- |
| set_topic_analysis_versions_updated_at | CREATE TRIGGER set_topic_analysis_versions_updated_at BEFORE UPDATE ON public.topic_analysis_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |

## Relations

```mermaid
erDiagram

"public.topic_analysis_classifications" }o--|| "public.topic_analysis_versions" : "FOREIGN KEY (version_id) REFERENCES topic_analysis_versions(id) ON DELETE CASCADE"
"public.topic_analysis_topics" }o--|| "public.topic_analysis_versions" : "FOREIGN KEY (version_id) REFERENCES topic_analysis_versions(id) ON DELETE CASCADE"
"public.topic_analysis_versions" }o--o| "public.bills" : "FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE"
"public.topic_analysis_versions" }o--o| "public.interview_topics" : "FOREIGN KEY (interview_topic_id) REFERENCES interview_topics(id) ON DELETE CASCADE"

"public.topic_analysis_versions" {
  uuid id
  uuid bill_id FK
  integer version
  text status
  text summary_md
  jsonb intermediate_results
  text error_message
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
  text current_step
  timestamp_with_time_zone started_at
  timestamp_with_time_zone completed_at
  jsonb phase_data
  uuid interview_topic_id FK
}
"public.topic_analysis_classifications" {
  uuid id
  uuid version_id FK
  uuid interview_report_id FK
  uuid topic_id FK
  integer opinion_index
}
"public.topic_analysis_topics" {
  uuid id
  uuid version_id FK
  text name
  text description_md
  jsonb representative_opinions
  integer sort_order
  timestamp_with_time_zone created_at
}
"public.bills" {
  uuid id
  text name
  bill_status_enum status
  text status_note
  timestamp_with_time_zone published_at
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
  text thumbnail_url
  bill_publish_status publish_status
  boolean is_featured
  text share_thumbnail_url
  uuid council_session_id FK
  integer publish_status_order
  text bill_number
  integer status_order
  text source_url
  text bill_type
  text__ discussion_overview_points
  date submitted_date
  date decided_date
  boolean is_review_completed
  date submitted_on
}
"public.interview_topics" {
  uuid id
  uuid author_user_id FK
  text title
  text body_md
  text status
  timestamp_with_time_zone opened_at
  timestamp_with_time_zone closes_at
  timestamp_with_time_zone closed_at
  text closed_reason
  text author_display_name
  text author_role
  text author_faction_name
  timestamp_with_time_zone withdrawn_at
  text withdrawn_reason
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
