-- Fix: Expand CHECK constraint on person_memberships.membership_type
-- The original constraint only allowed ('team_member', 'client_contact', 'contractor', 'partner', 'advisor')
-- but the UI uses ('team_member', 'client_user', 'contact', 'billing'). This migration makes the
-- constraint a superset of both sets so all existing + new values are valid.

ALTER TABLE greenhouse_core.person_memberships
  DROP CONSTRAINT IF EXISTS person_memberships_membership_type_check;

ALTER TABLE greenhouse_core.person_memberships
  ADD CONSTRAINT person_memberships_membership_type_check
  CHECK (membership_type IN (
    'team_member',
    'client_contact',
    'client_user',
    'contact',
    'billing',
    'contractor',
    'partner',
    'advisor'
  ));
