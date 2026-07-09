-- Up Migration

-- TASK-1371 follow-up: the first additive migration preserved the existing
-- ambiguous legacy string through COALESCE. Careers now prefers structured
-- fields, but the compatibility field must not keep candidate-facing ambiguity.

UPDATE greenhouse_hiring.hiring_opening
SET public_location_mode = public_hiring_region,
    publication_source_ref = COALESCE(publication_source_ref, 'job-brief-account-manager-marketing-20260709')
WHERE public_id = 'EO-OPN-0009'
  AND public_work_mode = 'remote'
  AND public_hiring_region IS NOT NULL;

-- Anti pre-up-marker bug guard (ISSUE-068): aborta si el forward-fix no corrigio
-- el fallback legacy ni amarro el source ref idempotente del brief.
DO $$
DECLARE fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM greenhouse_hiring.hiring_opening
  WHERE public_id = 'EO-OPN-0009'
    AND public_work_mode = 'remote'
    AND public_hiring_region = 'LATAM'
    AND public_location_mode = 'LATAM'
    AND publication_source_ref = 'job-brief-account-manager-marketing-20260709';

  IF fixed_count <> 1 THEN
    RAISE EXCEPTION 'TASK-1371 anti pre-up-marker: Account Manager legacy location/source ref forward-fix missing.';
  END IF;
END
$$;

-- Down Migration

-- Down is intentionally non-destructive: restoring the old ambiguous candidate
-- copy would violate the TASK-1371 publication contract.
