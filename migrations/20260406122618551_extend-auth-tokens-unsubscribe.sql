-- Up Migration
-- Extend auth_tokens.token_type CHECK to include 'unsubscribe' for email preference management

ALTER TABLE greenhouse_core.auth_tokens
  DROP CONSTRAINT IF EXISTS auth_tokens_token_type_check;

ALTER TABLE greenhouse_core.auth_tokens
  ADD CONSTRAINT auth_tokens_token_type_check
  CHECK (token_type IN ('reset', 'invite', 'verify', 'unsubscribe'));

-- Down Migration

ALTER TABLE greenhouse_core.auth_tokens
  DROP CONSTRAINT IF EXISTS auth_tokens_token_type_check;

ALTER TABLE greenhouse_core.auth_tokens
  ADD CONSTRAINT auth_tokens_token_type_check
  CHECK (token_type IN ('reset', 'invite', 'verify'));
