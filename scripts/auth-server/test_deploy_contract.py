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
        self.assertNotIn('  push:', triggers)
        self.assertIn('  workflow_call:', WORKFLOW)
        self.assertIn('  workflow_dispatch:', WORKFLOW)
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

    def _squash_release(self, served_offset):
        """develop gets two Auth commits; main receives a squash with develop's final tree."""
        self.git('checkout', '-qb', 'develop')
        commits = []
        for text in ('served develop runtime', 'released develop runtime', 'newer develop runtime'):
            (self.repo / 'src/lib/auth.ts').write_text(text)
            self.git('commit', '-qam', text)
            commits.append(self.git('rev-parse', 'HEAD'))
        source = commits[1]
        self.git('push', '-q', 'origin', 'develop')
        squash = self.git('commit-tree', self.git('rev-parse', source + '^{tree}'), '-p', self.sha, '-m', 'release squash')
        revision = {'spec': {'containers': [{'env': [{'name': 'GIT_SHA', 'value': commits[served_offset]}]}]}}
        return self.run_step('Check deployed revision drift', EXPECTED_SHA=squash,
                             TEST_REVISION=json.dumps(revision), GCP_PROJECT_ID='test', GCP_REGION='test')

    def test_squash_release_may_replace_the_develop_commit_it_contains(self):
        result = self._squash_release(served_offset=0)
        self.assertNotIn('target would replace unpromoted or newer Auth runtime', result.stdout)
        self.assertIn('the develop commit squashed into', result.stdout)

    def test_squash_release_still_refuses_a_newer_served_develop_commit(self):
        result = self._squash_release(served_offset=2)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('target would replace unpromoted or newer Auth runtime', result.stdout)

    def test_squash_release_refuses_a_served_commit_hidden_by_a_reverted_tree(self):
        """develop A -> B -> R where R restores A's tree; a squash with that tree must not replace B."""
        self.git('checkout', '-qb', 'develop')
        (self.repo / 'src/lib/auth.ts').write_text('runtime A')
        self.git('commit', '-qam', 'A')
        tree_a = self.git('rev-parse', 'HEAD^{tree}')
        (self.repo / 'src/lib/auth.ts').write_text('runtime B')
        self.git('commit', '-qam', 'B (served)')
        served = self.git('rev-parse', 'HEAD')
        (self.repo / 'src/lib/auth.ts').write_text('runtime A')
        self.git('commit', '-qam', 'R reverts B')
        self.git('push', '-q', 'origin', 'develop')
        squash = self.git('commit-tree', tree_a, '-p', self.sha, '-m', 'retry of the squash of A')
        revision = {'spec': {'containers': [{'env': [{'name': 'GIT_SHA', 'value': served}]}]}}
        result = self.run_step('Check deployed revision drift', EXPECTED_SHA=squash,
                               TEST_REVISION=json.dumps(revision), GCP_PROJECT_ID='test', GCP_REGION='test')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('target would replace unpromoted or newer Auth runtime', result.stdout)

    def test_vendor_only_live_change_cannot_bypass_runtime_guard(self):
        (self.repo / 'vendor').mkdir()
        (self.repo / 'vendor/package.tgz').write_bytes(b'changed build input')
        self.git('add', 'vendor/package.tgz')
        self.git('commit', '-qm', 'unpromoted vendor input')
        current = self.git('rev-parse', 'HEAD')
        revision = {'spec': {'containers': [{'env': [{'name': 'GIT_SHA', 'value': current}]}]}}
        result = self.run_step('Check deployed revision drift', EXPECTED_SHA=self.sha,
                               TEST_REVISION=json.dumps(revision), GCP_PROJECT_ID='test', GCP_REGION='test')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('target would replace unpromoted or newer Auth runtime', result.stdout)

    def test_ignore_files_are_runtime_comparison_inputs(self):
        paths = workflow_run('Check deployed revision drift').split('WORKER_RUNTIME_PATHS=(', 1)[1].split(')', 1)[0]
        for name in ('.dockerignore', '.gcloudignore'):
            with self.subTest(name=name):
                self.assertIn(name, paths.split())

    def test_split_traffic_or_missing_source_never_deploys(self):
        split = {'status': {'traffic': [{'revisionName': 'a', 'percent': 50}, {'revisionName': 'b', 'percent': 50}]}}
        for env in ({'TEST_SERVICE': json.dumps(split)}, {'TEST_REVISION': '{"spec":{"containers":[{"env":[]}]}}'}):
            with self.subTest(env=env):
                result = self.run_step('Check deployed revision drift', EXPECTED_SHA=self.sha,
                                       GCP_PROJECT_ID='test', GCP_REGION='test', **env)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('ERROR:', result.stdout + result.stderr)

    def test_post_deploy_readback_requires_expected_sha_on_active_revision(self):
        revision = {'spec': {'containers': [{'env': [{'name': 'GIT_SHA', 'value': self.sha}]}]}}
        params = {'DEPLOY_NEEDED': 'true', 'PREVIOUS_GIT_SHA': '0' * 40,
                  'EXPECTED_SHA': self.sha, 'TEST_REVISION': json.dumps(revision),
                  'GCP_PROJECT_ID': 'test', 'GCP_REGION': 'test'}
        result = self.run_step('Verify active Auth revision', **params)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('100% traffic', result.stdout)
        self.assertIn('active_revision=auth-server-test', (self.repo / 'output').read_text())
        self.assertIn('served_sha=' + self.sha, (self.repo / 'output').read_text())
        bad_revision = {'spec': {'containers': [{'env': [{'name': 'GIT_SHA', 'value': 'f' * 40}]}]}}
        result = self.run_step('Verify active Auth revision', **(params | {'TEST_REVISION': json.dumps(bad_revision)}))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('active Auth revision', result.stdout)

    def test_post_skip_readback_requires_unchanged_active_revision(self):
        revision = {'spec': {'containers': [{'env': [{'name': 'GIT_SHA', 'value': self.sha}]}]}}
        params = {'DEPLOY_NEEDED': 'false', 'PREVIOUS_GIT_SHA': self.sha,
                  'EXPECTED_SHA': 'f' * 40, 'TEST_REVISION': json.dumps(revision),
                  'GCP_PROJECT_ID': 'test', 'GCP_REGION': 'test'}
        result = self.run_step('Verify active Auth revision', **params)
        self.assertEqual(result.returncode, 0, result.stderr)
        split = {'status': {'traffic': [{'revisionName': 'a', 'percent': 50},
                                       {'revisionName': 'b', 'percent': 50}]}}
        result = self.run_step('Verify active Auth revision', **(params | {'TEST_SERVICE': json.dumps(split)}))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('exactly one revision at 100% traffic', result.stderr)
        result = self.run_step('Verify active Auth revision', **(params | {'DEPLOY_NEEDED': ''}))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('invalid deploy decision', result.stdout)
        result = self.run_step('Verify active Auth revision', **(params | {'PREVIOUS_GIT_SHA': ''}))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('full source SHA', result.stdout)

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
