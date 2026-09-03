-- TASK-1349 — corrección compensatoria puntual (2026-09-03). Valentina Hoyos ('valentina-hoyos'): su salida employee
-- (LWD 2026-04-30) está ejecutada, pero tiene una relación contractor ACTIVA desde 2026-08-20 (reingreso). El
-- writeback de lifecycle la desactivó por error; un `updateMember` parcial volvió a poner active=true pero dejó
-- status='inactive', contract_end_date=2026-04-30 y assignable=false, y su asignación cerrada. La relación employee
-- ya fue re-terminada al 2026-04-30 por el command canónico. Este script restaura el resto a los valores previos.
-- Ejecutar UNA vez con: pnpm pg:connect:shell  →  \i scripts/workforce/restore-valentina-hoyos-2026-09-03.sql
BEGIN;
UPDATE greenhouse_core.members
   SET active = TRUE, status = 'active', contract_end_date = NULL, assignable = TRUE, updated_at = CURRENT_TIMESTAMP
 WHERE member_id = 'valentina-hoyos';
UPDATE greenhouse_core.client_team_assignments
   SET active = TRUE, end_date = NULL, updated_at = CURRENT_TIMESTAMP
 WHERE assignment_id = 'assignment-space-efeonce-valentina-hoyos' AND active = FALSE AND end_date = DATE '2026-04-30';
INSERT INTO greenhouse_hr.work_relationship_offboarding_case_events (event_id, offboarding_case_id, event_type, from_status, to_status, actor_user_id, source, reason, payload)
SELECT 'offboarding-case-event-' || gen_random_uuid()::text, offboarding_case_id, 'offboarding_case.lifecycle_writeback_reverted', status, status, 'user-efeonce-admin-julio-reyes', 'admin',
       'TASK-1349 recovery 2026-09-03: writeback aplicado sobre un member con reingreso (relación contractor activa desde 2026-08-20). Restaurados status/contract_end_date/assignable y la asignación. Compensación por SQL porque updateMember falla por bug ajeno (identity_profile_source_links.link_id).',
       jsonb_build_object('memberId','valentina-hoyos','restored',jsonb_build_object('active',true,'status','active','contract_end_date',null,'assignable',true,'assignment','assignment-space-efeonce-valentina-hoyos'))
  FROM greenhouse_hr.work_relationship_offboarding_cases WHERE public_id = 'EO-OFF-2026-45EC8688';
COMMIT;
SELECT member_id, active, status, contract_end_date, assignable FROM greenhouse_core.members WHERE member_id = 'valentina-hoyos';
SELECT assignment_id, active, end_date FROM greenhouse_core.client_team_assignments WHERE assignment_id = 'assignment-space-efeonce-valentina-hoyos';
SELECT relationship_type, status, effective_from, effective_to FROM greenhouse_core.person_legal_entity_relationships WHERE profile_id = (SELECT identity_profile_id FROM greenhouse_core.members WHERE member_id = 'valentina-hoyos') ORDER BY effective_from;
