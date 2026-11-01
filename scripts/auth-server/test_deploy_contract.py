"""Exercise production routing/SHA guards without cloud credentials or network."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = (ROOT / '.github/workflows/auth-server-deploy.yml').read_text()


def workflow_run(name):
    step = WORKFLOW.split('      - name: ' + name + '\n', 1)[1].split('\n      - name:', 1)[0]
    return textwrap.dedent(step.split('        run: |\n', 1)[1])


class DeployContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.git('init', '-q', '-b', 'main')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Deploy guard test')
        (self.repo / 'src/lib').mkdir(parents=True)
        (self.repo / 'src/lib/auth.ts').write_text('production baseline')
        self.git('add', '.')
        self.git('commit', '-qm', 'main baseline')
        self.sha = self.git('rev-parse', 'HEAD')
        self.git('update-ref', 'refs/remotes/origin/main', self.sha)
        # A local bare remote makes the actual workflow's fetch entirely offline.
        remote = self.repo / 'origin.git'
        subprocess.run(['git', 'clone', '--bare', '-q', str(self.repo), str(remote)], check=True)
        self.git('remote', 'add', 'origin', str(remote))
        (self.repo / 'scripts/auth-server').mkdir(parents=True)
        (self.repo / 'scripts/auth-server/rooms-config-drift.py').write_text((ROOT / 'scripts/auth-server/rooms-config-drift.py').read_text())
        self.bin = self.repo / 'bin'
        self.bin.mkdir()
        gcloud = self.bin / 'gcloud'
        gcloud.write_text('#!/bin/sh\nif [ "$2" = services ]; then printf "%s" "$TEST_SERVICE"; else printf "%s" "$TEST_REVISION"; fi\n')
        gcloud.chmod(0o755)
        self.env = dict(os.environ, PATH=str(self.bin) + ':' + os.environ['PATH'],
                        GITHUB_REF='refs/heads/main', REQUESTED_ENVIRONMENT='production',
                        TEST_SERVICE=json.dumps({'status': {'traffic': [{'revisionName': 'auth-server-test', 'percent': 100}]}}),
                        RAW_EXPECTED_SHA=self.sha, GITHUB_ENV=str(self.repo / 'env'),
                        GITHUB_OUTPUT=str(self.repo / 'output'), GITHUB_EVENT_NAME='workflow_dispatch',
                        DESIRED_AUTH_SERVER_INTERNAL_AUTH_ENABLED='false',
                        DESIRED_EXTERNAL_IDENTITY_CANARY_ENABLED='false',
                        DESIRED_AUTH_SERVER_INTERNAL_MULTI_ORG_ENABLED='false',
                        DESIRED_AUTH_SERVER_INTERNAL_MULTI_ORG_PROFILE_IDS='')

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.repo, text=True, stderr=subprocess.DEVNULL).strip()

    def run_step(self, name, **env):
        return subprocess.run(['bash', '-c', workflow_run(name)], cwd=self.repo,
                              env=self.env | env, capture_output=True, text=True)

    def test_trigger_environment_and_lock_are_production_only(self):
        triggers = WORKFLOW.split('  workflow_dispatch:', 1)[0]
        self.assertIn('      - main\n', triggers)
        self.assertNotIn('develop', triggers)
        self.assertIn('    environment: production\n', WORKFLOW)
        self.assertIn('  group: auth-server-production\n  cancel-in-progress: false', WORKFLOW)
        self.assertNotIn("|| 'staging'", WORKFLOW)
        self.assertLess(WORKFLOW.index('- name: Resolve expected SHA'), WORKFLOW.index('- name: Authenticate to Google Cloud'))

    def test_main_dispatch_checks_out_exact_target(self):
        (self.repo / 'docs').mkdir()
        (self.repo / 'docs/note').write_text('later commit')
        self.git('add', 'docs/note')
        self.git('commit', '-qm', 'later source')
        result = self.run_step('Resolve expected SHA')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.git('rev-parse', 'HEAD'), self.sha)
        self.assertIn('expected_sha=' + self.sha, (self.repo / 'output').read_text())

    def test_develop_dispatch_and_staging_rejected(self):
        for env in ({'GITHUB_REF': 'refs/heads/develop'}, {'REQUESTED_ENVIRONMENT': 'staging'}):
            with self.subTest(env=env):
                result = self.run_step('Resolve expected SHA', **env)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('only main + production', result.stdout)

    def test_full_sha_and_main_membership_required(self):
        result = self.run_step('Resolve expected SHA', RAW_EXPECTED_SHA=self.sha[:8])
        self.assertNotEqual(result.returncode, 0)
        (self.repo / 'src/lib/auth.ts').write_text('unpromoted feature')
        self.git('commit', '-qam', 'develop-only Auth change')
        result = self.run_step('Resolve expected SHA', RAW_EXPECTED_SHA=self.git('rev-parse', 'HEAD'))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('not published on main', result.stdout)

    def test_current_runtime_cannot_be_replaced_by_unpromoted_main(self):
        (self.repo / 'src/lib/auth.ts').write_text('live develop feature')
        self.git('commit', '-qam', 'live runtime')
        current = self.git('rev-parse', 'HEAD')
        revision = {'spec': {'containers': [{'env': [{'name': 'GIT_SHA', 'value': current}]}]}}
        result = self.run_step('Check deployed revision drift', EXPECTED_SHA=self.sha,
                               TEST_REVISION=json.dumps(revision), GCP_PROJECT_ID='test', GCP_REGION='test')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('target would replace unpromoted or newer Auth runtime', result.stdout)

    def test_split_traffic_or_missing_source_never_deploys(self):
        split = {'status': {'traffic': [{'revisionName': 'a', 'percent': 50}, {'revisionName': 'b', 'percent': 50}]}}
        for env in ({'TEST_SERVICE': json.dumps(split)}, {'TEST_REVISION': '{"spec":{"containers":[{"env":[]}]}}'}):
            with self.subTest(env=env):
                result = self.run_step('Check deployed revision drift', EXPECTED_SHA=self.sha,
                                       GCP_PROJECT_ID='test', GCP_REGION='test', **env)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('ERROR:', result.stdout + result.stderr)

    def test_numeric_secret_pins_pass_unversioned_names_to_iam(self):
        source = (ROOT / 'services/auth-server/deploy.sh').read_text()
        refs = ('RESEND_API_KEY_SECRET_REF', 'AUTH_SERVER_INVITATION_EMAIL_OTP_HMAC_SECRET_REF', 'ROOMS_INVITATION_AUTHORITY_TOKEN_SECRET_REF')
        calls = '\n'.join(line.strip() for line in source.splitlines()
                          if line.strip().startswith('ensure_secret_accessor_binding ') and any(ref in line for ref in refs))
        script = 'ensure_secret_accessor_binding() { printf "%s\\n" "$1"; };\n' + calls
        result = subprocess.run(['bash', '-c', script], capture_output=True, text=True,
                                env=self.env | {ref: 'test-secret:1' for ref in refs})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.splitlines(), ['test-secret'] * 3)

    def test_deploy_script_rejects_staging_mailer_before_cloud(self):
        result = subprocess.run(['bash', str(ROOT / 'services/auth-server/deploy.sh')],
                                cwd=self.repo, env=self.env | {'ENV': 'production',
                                'EXPECTED_SHA': self.sha, 'RESEND_API_KEY_SECRET_REF': 'greenhouse-resend-api-key-staging:1'},
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('requires the production Resend secret', result.stdout)

    def test_deploy_script_rejects_staging_or_mislabeled_source_before_cloud(self):
        for env in ({'ENV': 'staging'}, {'ENV': 'production', 'EXPECTED_SHA': '0' * 40}):
            with self.subTest(env=env):
                result = subprocess.run(['bash', str(ROOT / 'services/auth-server/deploy.sh')],
                                        cwd=self.repo, env=self.env | env, capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('ERROR:', result.stdout)


if __name__ == '__main__':
    unittest.main()
