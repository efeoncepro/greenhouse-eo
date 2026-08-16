-- Up Migration

INSERT INTO greenhouse_core.view_registry
  (view_code,section,label,description,route_group,route_path,icon,display_order,active,updated_by)
VALUES (
  'gestion.hiring_talent_pool','gestion','Hiring — Banco de talento',
  'Búsqueda person-first de talento evaluado con evidencia, vigencia y contacto gobernado.',
  'internal','/agency/hiring/talent-pool','tabler-user-search',20,TRUE,'migration:TASK-1725'
)
ON CONFLICT (view_code) DO UPDATE SET
  section=EXCLUDED.section,label=EXCLUDED.label,description=EXCLUDED.description,
  route_group=EXCLUDED.route_group,route_path=EXCLUDED.route_path,icon=EXCLUDED.icon,
  display_order=EXCLUDED.display_order,active=TRUE,updated_at=NOW(),updated_by='migration:TASK-1725';

INSERT INTO greenhouse_core.role_view_assignments
  (role_code,view_code,granted,granted_by,granted_at,updated_at,updated_by)
SELECT role_code,'gestion.hiring_talent_pool',TRUE,'migration:TASK-1725',NOW(),NOW(),'migration:TASK-1725'
FROM (VALUES ('efeonce_admin'),('hr_manager'),('efeonce_operations')) roles(role_code)
ON CONFLICT (role_code,view_code) DO UPDATE SET
  granted=TRUE,updated_at=NOW(),updated_by='migration:TASK-1725';

DO $$
DECLARE registered_count INTEGER; granted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered_count FROM greenhouse_core.view_registry
   WHERE view_code='gestion.hiring_talent_pool' AND active=TRUE;
  SELECT COUNT(*) INTO granted_count FROM greenhouse_core.role_view_assignments
   WHERE view_code='gestion.hiring_talent_pool' AND granted=TRUE
     AND role_code IN ('efeonce_admin','hr_manager','efeonce_operations');
  IF registered_count<>1 OR granted_count<>3 THEN
    RAISE EXCEPTION 'TASK-1725 anti pre-up-marker: registered=%, grants=%', registered_count,granted_count;
  END IF;
END $$;

-- Down Migration

UPDATE greenhouse_core.role_view_assignments SET granted=FALSE,updated_at=NOW(),updated_by='migration:TASK-1725:revert'
 WHERE view_code='gestion.hiring_talent_pool';
UPDATE greenhouse_core.view_registry SET active=FALSE,updated_at=NOW(),updated_by='migration:TASK-1725:revert'
 WHERE view_code='gestion.hiring_talent_pool';
