-- Migration: Add assignable flag to members
-- Allows excluding specific members from the Agency Team assignment view.
-- Default TRUE — all existing members remain assignable.

ALTER TABLE greenhouse_core.members
  ADD COLUMN IF NOT EXISTS assignable BOOLEAN NOT NULL DEFAULT TRUE;
