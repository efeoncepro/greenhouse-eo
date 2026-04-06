-- Half-day leave request support: start_period and end_period columns.
-- Values: 'full_day' (default), 'morning', 'afternoon'.
-- Existing rows default to 'full_day' (backward compatible).

SET search_path = greenhouse_hr, public;

ALTER TABLE leave_requests
  ADD COLUMN start_period TEXT NOT NULL DEFAULT 'full_day',
  ADD COLUMN end_period TEXT NOT NULL DEFAULT 'full_day';

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_start_period_check
    CHECK (start_period IN ('full_day', 'morning', 'afternoon'));

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_end_period_check
    CHECK (end_period IN ('full_day', 'morning', 'afternoon'));
