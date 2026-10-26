import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('rooms_drift', Path(__file__).with_name('rooms-config-drift.py'))
drift = importlib.util.module_from_spec(spec)
spec.loader.exec_module(drift)


class RoomsConfigDriftTests(unittest.TestCase):
    def configured(self):
        desired = {name: 'true' for name in drift.FLAGS}
        desired.update(zip(drift.VALUES, ('efeonce-rp-rooms', 'https://rooms.example.invalid')))
        entries = [{'name': key, 'value': value} for key, value in desired.items()]
        for name in drift.SECRETS:
            desired[name + '_REF'] = 'projects/efeonce-group/secrets/' + name.lower() + '/versions/3'
            entries.append({'name': name, 'valueFrom': {'secretKeyRef': {'name': name.lower(), 'key': '3'}}})
        return {'spec': {'containers': [{'env': entries}]}}, desired

    def test_pre_rollout_missing_flags_are_off(self):
        self.assertTrue(drift.config_matches({'spec': {'containers': [{'env': []}]}}, {}))

    def test_complete_enabled_registration_matches(self):
        self.assertTrue(drift.config_matches(*self.configured()))

    def test_flag_only_enable_requires_deploy(self):
        self.assertFalse(drift.config_matches({'spec': {'containers': [{'env': []}]}}, {drift.FLAGS[0]: 'true'}))

    def test_rotated_reference_requires_deploy(self):
        revision, desired = self.configured()
        desired[drift.SECRETS[0] + '_REF'] = drift.SECRETS[0].lower() + ':4'
        self.assertFalse(drift.config_matches(revision, desired))

    def test_plaintext_secret_never_counts_as_mount(self):
        revision, desired = self.configured()
        revision['spec']['containers'][0]['env'][-1] = {'name': drift.SECRETS[-1], 'value': 'not-a-mounted-secret'}
        self.assertFalse(drift.config_matches(revision, desired))

    def test_cross_project_reference_never_matches_local_mount(self):
        revision, desired = self.configured()
        key = drift.SECRETS[0] + '_REF'
        desired[key] = desired[key].replace('projects/efeonce-group/', 'projects/other-project/')
        self.assertFalse(drift.config_matches(revision, desired))

    def test_callback_origin_change_requires_deploy(self):
        revision, desired = self.configured()
        desired[drift.VALUES[1]] = 'https://other.example.invalid'
        self.assertFalse(drift.config_matches(revision, desired))

    def test_disabled_otp_does_not_require_secret_mounts(self):
        revision, desired = self.configured()
        desired[drift.FLAGS[1]] = 'false'
        revision['spec']['containers'][0]['env'][1]['value'] = 'false'
        revision['spec']['containers'][0]['env'] = revision['spec']['containers'][0]['env'][:-2]
        self.assertTrue(drift.config_matches(revision, desired))

    def test_disabled_otp_with_stale_mounts_requires_deploy(self):
        revision, desired = self.configured()
        desired[drift.FLAGS[1]] = 'false'
        revision['spec']['containers'][0]['env'][1]['value'] = 'false'
        self.assertFalse(drift.config_matches(revision, desired))

    def production(self):
        revision = {'spec': {'containers': [{'env': [
            {'name': 'SENTRY_ENVIRONMENT', 'value': 'production'},
            {'name': 'RESEND_API_KEY_SECRET_REF', 'value': 'greenhouse-resend-api-key-production:1'},
            {'name': 'RESEND_API_KEY', 'valueFrom': {'secretKeyRef': {'name': 'greenhouse-resend-api-key-production', 'key': '1'}}},
        ]}]}}
        return revision, {'ENV': 'production'}

    def test_production_config_matches_pinned_resend(self):
        self.assertTrue(drift.config_matches(*self.production()))

    def test_staging_sentry_requires_deploy_even_if_code_matches(self):
        revision, desired = self.production()
        revision['spec']['containers'][0]['env'][0]['value'] = 'staging'
        self.assertFalse(drift.config_matches(revision, desired))

    def test_resend_declared_and_mounted_must_both_match_production_pin(self):
        for entry, field, value in ((1, 'value', 'greenhouse-resend-api-key-staging'), (2, 'valueFrom', {'secretKeyRef': {'name': 'greenhouse-resend-api-key-production', 'key': 'latest'}})):
            with self.subTest(entry=entry):
                revision, desired = self.production()
                revision['spec']['containers'][0]['env'][entry][field] = value
                self.assertFalse(drift.config_matches(revision, desired))

    def test_malformed_metadata_never_skips(self):
        self.assertFalse(drift.config_matches({}, {}))


if __name__ == '__main__':
    unittest.main()
