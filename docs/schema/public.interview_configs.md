# public.interview_configs

## Description

議案または議題ごとのインタビュー設定を管理するテーブル

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | uuid | gen_random_uuid() | false | [public.interview_questions](public.interview_questions.md) [public.interview_sessions](public.interview_sessions.md) |  |  |
| bill_id | uuid |  | true |  | [public.bills](public.bills.md) | 対象議案ID（議案の設定のとき。複数設定可、ただしpublicは1つのみ） |
| status | interview_config_status_enum | 'closed'::interview_config_status_enum | false |  |  | 設定ステータス（public: 公開/有効, closed: 非公開/無効） |
| themes | text[] |  | true |  |  | テーマの配列 |
| knowledge_source | text |  | true |  |  | 議案のコンテキスト情報 |
| created_at | timestamp with time zone | now() | false |  |  | 作成日時 |
| updated_at | timestamp with time zone | now() | false |  |  | 更新日時 |
| name | text |  | false |  |  | 設定名（識別用） |
| mode | interview_mode_enum | 'loop'::interview_mode_enum | false |  |  | インタビューモード: loop（逐次深掘り）または bulk（一括深掘り） |
| chat_model | text |  | true |  |  | チャット用AIモデルID（OpenAI API のモデルID 例:"gpt-5-mini" NULL=デフォルト） |
| estimated_duration | integer |  | true |  |  | 目安所要時間(分・NULLはタイムマネジメントしない) |
| interview_topic_id | uuid |  | true |  | [public.interview_topics](public.interview_topics.md) | 対象議題ID（議題の設定のとき。議題ごとに1つ。受付可否は議題の status で判定し、この表の status は使わない） |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| interview_configs_subject_exactly_one | CHECK | CHECK ((num_nonnulls(bill_id, interview_topic_id) = 1)) |
| interview_configs_bill_id_fkey | FOREIGN KEY | FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE |
| interview_configs_pkey | PRIMARY KEY | PRIMARY KEY (id) |
| interview_configs_interview_topic_id_fkey | FOREIGN KEY | FOREIGN KEY (interview_topic_id) REFERENCES interview_topics(id) ON DELETE CASCADE |

## Indexes

| Name | Definition |
| ---- | ---------- |
| interview_configs_pkey | CREATE UNIQUE INDEX interview_configs_pkey ON public.interview_configs USING btree (id) |
| idx_interview_configs_bill_id | CREATE INDEX idx_interview_configs_bill_id ON public.interview_configs USING btree (bill_id) |
| idx_interview_configs_bill_public | CREATE UNIQUE INDEX idx_interview_configs_bill_public ON public.interview_configs USING btree (bill_id) WHERE (status = 'public'::interview_config_status_enum) |
| idx_interview_configs_status | CREATE INDEX idx_interview_configs_status ON public.interview_configs USING btree (status) |
| idx_interview_configs_interview_topic_id | CREATE UNIQUE INDEX idx_interview_configs_interview_topic_id ON public.interview_configs USING btree (interview_topic_id) WHERE (interview_topic_id IS NOT NULL) |

## Triggers

| Name | Definition |
| ---- | ---------- |
| update_interview_configs_updated_at | CREATE TRIGGER update_interview_configs_updated_at BEFORE UPDATE ON public.interview_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column() |

## Relations

```mermaid
erDiagram

"public.interview_questions" }o--|| "public.interview_configs" : "FOREIGN KEY (interview_config_id) REFERENCES interview_configs(id) ON DELETE CASCADE"
"public.interview_sessions" }o--|| "public.interview_configs" : "FOREIGN KEY (interview_config_id) REFERENCES interview_configs(id) ON DELETE CASCADE"
"public.interview_configs" }o--o| "public.bills" : "FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE"
"public.interview_configs" }o--o| "public.interview_topics" : "FOREIGN KEY (interview_topic_id) REFERENCES interview_topics(id) ON DELETE CASCADE"

"public.interview_configs" {
  uuid id
  uuid bill_id FK
  interview_config_status_enum status
  text__ themes
  text knowledge_source
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
  text name
  interview_mode_enum mode
  text chat_model
  integer estimated_duration
  uuid interview_topic_id FK
}
"public.interview_questions" {
  uuid id
  uuid interview_config_id FK
  text question
  text follow_up_guide
  text__ quick_replies
  integer question_order
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
}
"public.interview_sessions" {
  uuid id
  uuid interview_config_id FK
  uuid user_id
  timestamp_with_time_zone started_at
  timestamp_with_time_zone completed_at
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
  timestamp_with_time_zone archived_at
  smallint rating
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
