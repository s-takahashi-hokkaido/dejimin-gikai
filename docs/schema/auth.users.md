# auth.users

## Description

Auth: Stores user login data within a secure schema.

## Columns

| Name | Type | Default | Nullable | Extra Definition | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | ---------------- | -------- | ------- | ------- |
| instance_id | uuid |  | true |  |  |  |  |
| id | uuid |  | false |  | [public.expert_registrations](public.expert_registrations.md) [public.admin_profiles](public.admin_profiles.md) |  |  |
| aud | varchar(255) |  | true |  |  |  |  |
| role | varchar(255) |  | true |  |  |  |  |
| email | varchar(255) |  | true |  |  |  |  |
| encrypted_password | varchar(255) |  | true |  |  |  |  |
| email_confirmed_at | timestamp with time zone |  | true |  |  |  |  |
| invited_at | timestamp with time zone |  | true |  |  |  |  |
| confirmation_token | varchar(255) |  | true |  |  |  |  |
| confirmation_sent_at | timestamp with time zone |  | true |  |  |  |  |
| recovery_token | varchar(255) |  | true |  |  |  |  |
| recovery_sent_at | timestamp with time zone |  | true |  |  |  |  |
| email_change_token_new | varchar(255) |  | true |  |  |  |  |
| email_change | varchar(255) |  | true |  |  |  |  |
| email_change_sent_at | timestamp with time zone |  | true |  |  |  |  |
| last_sign_in_at | timestamp with time zone |  | true |  |  |  |  |
| raw_app_meta_data | jsonb |  | true |  |  |  |  |
| raw_user_meta_data | jsonb |  | true |  |  |  |  |
| is_super_admin | boolean |  | true |  |  |  |  |
| created_at | timestamp with time zone |  | true |  |  |  |  |
| updated_at | timestamp with time zone |  | true |  |  |  |  |
| phone | text | NULL::character varying | true |  |  |  |  |
| phone_confirmed_at | timestamp with time zone |  | true |  |  |  |  |
| phone_change | text | ''::character varying | true |  |  |  |  |
| phone_change_token | varchar(255) | ''::character varying | true |  |  |  |  |
| phone_change_sent_at | timestamp with time zone |  | true |  |  |  |  |
| confirmed_at | timestamp with time zone |  | true | GENERATED ALWAYS AS LEAST(email_confirmed_at, phone_confirmed_at) STORED |  |  |  |
| email_change_token_current | varchar(255) | ''::character varying | true |  |  |  |  |
| email_change_confirm_status | smallint | 0 | true |  |  |  |  |
| banned_until | timestamp with time zone |  | true |  |  |  |  |
| reauthentication_token | varchar(255) | ''::character varying | true |  |  |  |  |
| reauthentication_sent_at | timestamp with time zone |  | true |  |  |  |  |
| is_sso_user | boolean | false | false |  |  |  | Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails. |
| deleted_at | timestamp with time zone |  | true |  |  |  |  |
| is_anonymous | boolean | false | false |  |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| users_email_change_confirm_status_check | CHECK | CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2))) |
| users_pkey | PRIMARY KEY | PRIMARY KEY (id) |
| users_phone_key | UNIQUE | UNIQUE (phone) |

## Indexes

| Name | Definition | Comment |
| ---- | ---------- | ------- |
| users_pkey | CREATE UNIQUE INDEX users_pkey ON auth.users USING btree (id) |  |
| users_instance_id_idx | CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id) |  |
| users_instance_id_email_idx | CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text)) |  |
| confirmation_token_idx | CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text) |  |
| recovery_token_idx | CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text) |  |
| email_change_token_current_idx | CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text) |  |
| email_change_token_new_idx | CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text) |  |
| reauthentication_token_idx | CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text) |  |
| users_email_partial_key | CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false) | Auth: A partial unique index that applies only when is_sso_user is false |
| users_phone_key | CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone) |  |
| users_is_anonymous_idx | CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous) |  |

## Relations

```mermaid
erDiagram

"public.expert_registrations" }o--|| "auth.users" : "FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE"
"public.admin_profiles" |o--|| "auth.users" : "FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE"

"auth.users" {
  uuid instance_id
  uuid id
  varchar_255_ aud
  varchar_255_ role
  varchar_255_ email
  varchar_255_ encrypted_password
  timestamp_with_time_zone email_confirmed_at
  timestamp_with_time_zone invited_at
  varchar_255_ confirmation_token
  timestamp_with_time_zone confirmation_sent_at
  varchar_255_ recovery_token
  timestamp_with_time_zone recovery_sent_at
  varchar_255_ email_change_token_new
  varchar_255_ email_change
  timestamp_with_time_zone email_change_sent_at
  timestamp_with_time_zone last_sign_in_at
  jsonb raw_app_meta_data
  jsonb raw_user_meta_data
  boolean is_super_admin
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
  text phone
  timestamp_with_time_zone phone_confirmed_at
  text phone_change
  varchar_255_ phone_change_token
  timestamp_with_time_zone phone_change_sent_at
  timestamp_with_time_zone confirmed_at
  varchar_255_ email_change_token_current
  smallint email_change_confirm_status
  timestamp_with_time_zone banned_until
  varchar_255_ reauthentication_token
  timestamp_with_time_zone reauthentication_sent_at
  boolean is_sso_user
  timestamp_with_time_zone deleted_at
  boolean is_anonymous
}
"public.expert_registrations" {
  uuid id
  text name
  text affiliation
  text email
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
  uuid user_id FK
}
"public.admin_profiles" {
  uuid user_id FK
  text role
  uuid faction_id FK
  text display_name
  timestamp_with_time_zone created_at
  timestamp_with_time_zone updated_at
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
