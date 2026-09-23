-- Vercel AI Gateway を外し OpenAI を直接呼ぶため、interview_configs.chat_model を
-- Gateway 形式（"openai/gpt-5-mini"）から OpenAI API のモデルID（"gpt-5-mini"）に直す。
-- 送信先を OpenAI 1社とするため、OpenAI 以外のモデルが入っている行は NULL（=デフォルト）に戻す。

UPDATE "public"."interview_configs"
SET "chat_model" = CASE "chat_model"
    -- Gateway 独自の名前は OpenAI API の名前に読み替える
    WHEN 'openai/gpt-5-chat' THEN 'gpt-5-chat-latest'
    WHEN 'openai/gpt-5.1-instant' THEN 'gpt-5.1-chat-latest'
    WHEN 'openai/gpt-5.1-thinking' THEN 'gpt-5.1'
    ELSE substring("chat_model" FROM length('openai/') + 1)
  END
WHERE "chat_model" LIKE 'openai/%';

UPDATE "public"."interview_configs"
SET "chat_model" = NULL
WHERE "chat_model" LIKE '%/%';

COMMENT ON COLUMN "public"."interview_configs"."chat_model" IS 'チャット用AIモデルID（OpenAI API のモデルID 例:"gpt-5-mini" NULL=デフォルト）';
