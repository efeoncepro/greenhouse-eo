BEGIN;
INSERT INTO greenhouse_growth.grader_profiles(profile_id,brand_name,status) VALUES ('test-brand','Test','active');
INSERT INTO greenhouse_growth.grader_profile_markets(market_id,profile_id,market_code,locale,is_primary,created_by) VALUES
 ('test-pe','test-brand','PE','es-PE',true,'test'),('test-us','test-brand','US','en-US',false,'test');
INSERT INTO greenhouse_growth.grader_competitor_sets(competitor_set_id,market_id,version,status,members_json,reason,created_by)
 VALUES ('test-set','test-pe',1,'active','[{"name":"GOL","aliases":[],"matchMode":"word_cs","position":1}]','test','test');
INSERT INTO greenhouse_growth.grader_runs(run_id,profile_id,market_id,market_code,locale,competitor_set_id,matching_snapshot)
 VALUES ('test-run','test-brand','test-pe','PE','es-PE','test-set','{"version":"matching.v1"}');
DO $$ BEGIN
 BEGIN UPDATE greenhouse_growth.grader_profile_markets SET market_code='US' WHERE market_id='test-pe'; RAISE EXCEPTION 'expected immutable market';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='expected immutable market' THEN RAISE; END IF; END;
 BEGIN UPDATE greenhouse_growth.grader_competitor_sets SET members_json='[]' WHERE competitor_set_id='test-set'; RAISE EXCEPTION 'expected immutable set';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='expected immutable set' THEN RAISE; END IF; END;
 BEGIN UPDATE greenhouse_growth.grader_runs SET matching_snapshot='{}' WHERE run_id='test-run'; RAISE EXCEPTION 'expected immutable snapshot';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='expected immutable snapshot' THEN RAISE; END IF; END;
 BEGIN UPDATE greenhouse_growth.grader_profile_markets SET is_primary=true WHERE market_id='test-us'; RAISE EXCEPTION 'expected primary unique';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
-- Primary handover can be atomic; the deferred invariant is checked at transaction end.
UPDATE greenhouse_growth.grader_profile_markets SET is_primary=false WHERE market_id='test-pe';
UPDATE greenhouse_growth.grader_profile_markets SET is_primary=true WHERE market_id='test-us';
SET CONSTRAINTS ALL IMMEDIATE;
UPDATE greenhouse_growth.grader_profiles SET recurring_regrade_enabled=true,recurring_regrade_cadence='quarterly',
 recurring_regrade_next_at='2027-01-01T00:00:00Z' WHERE profile_id='test-brand';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM greenhouse_growth.grader_profile_markets WHERE market_id='test-us' AND recurring_regrade_enabled
   AND recurring_regrade_cadence='quarterly' AND recurring_regrade_next_at='2027-01-01T00:00:00Z') THEN RAISE EXCEPTION 'primary schedule mirror missing'; END IF;
 BEGIN UPDATE greenhouse_growth.grader_profile_markets SET is_primary=false WHERE market_id='test-us'; RAISE EXCEPTION 'expected primary required';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='expected primary required' THEN RAISE; END IF; END;
 BEGIN INSERT INTO greenhouse_growth.grader_runs(run_id,profile_id,market_id) VALUES ('cross-profile','another-profile','test-pe'); RAISE EXCEPTION 'expected profile FK';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;
ROLLBACK;
