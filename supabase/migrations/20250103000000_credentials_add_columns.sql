-- Add missing columns to credentials table
-- base_url: needed for proxy providers (OpenAI-compatible, Azure, LiteLLM)
-- key_suffix: masked last 4 chars for safe display (e.g., "...a1b2")

ALTER TABLE credentials ADD COLUMN IF NOT EXISTS base_url TEXT;
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS key_suffix TEXT NOT NULL DEFAULT '...****';

-- Add comment explaining the encrypted_key field
COMMENT ON COLUMN credentials.encrypted_key IS
  'API key encrypted at rest. Decrypt server-side only when injecting into run execution. '
  'Never expose to browser. The key_suffix column provides safe display text.';

COMMENT ON COLUMN credentials.key_suffix IS
  'Masked suffix of the API key (e.g., "...a1b2"). Safe for browser display. '
  'Generated server-side during credential creation.';

COMMENT ON COLUMN credentials.base_url IS
  'Optional base URL for proxy providers (OpenAI-compatible, Azure, LiteLLM, Bedrock). '
  'NULL for direct providers (Anthropic, Google, Mistral, Moonshot).';
