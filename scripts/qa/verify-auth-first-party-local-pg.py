#!/usr/bin/env python3
"""TASK-1834: isolated local PostgreSQL contract test; never reads live DB config."""
import argparse
import glob
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]


def server_bin():
    candidates = [shutil.which('postgres')]
    candidates += glob.glob('/opt/homebrew/opt/postgresql*/bin/postgres')
    candidates += glob.glob('/usr/local/opt/postgresql*/bin/postgres')
    candidates += glob.glob('/usr/lib/postgresql/*/bin/postgres')
    for candidate in candidates:
        if candidate and all((Path(candidate).parent / name).is_file()
                             for name in ('postgres', 'initdb', 'pg_ctl', 'psql')):
            return Path(candidate).parent
    raise RuntimeError('A local PostgreSQL server binary is required; libpq alone is insufficient.')


def run(args, **kwargs):
    return subprocess.run([str(arg) for arg in args], check=True, **kwargs)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--serve', action='store_true', help='Keep an isolated issuer and database alive for consumer integration QA.')
    parser.add_argument('--otp', action='store_true', help='Apply issuer OTP migration and wire memory-only delivery.')
    parser.add_argument('--otp-smoke', action='store_true', help='Run isolated HTTP OTP smoke with a fake loopback authority and exit.')
    parser.add_argument('--mcp-smoke', action='store_true', help='Run isolated first-party to MCP consent HTTP smoke and exit.')
    parser.add_argument('--two-rp-smoke', action='store_true', help='Run isolated two first-party clients over real HTTP and PostgreSQL, then exit.')
    parser.add_argument('--mcp-pg', action='store_true', help='Use the PostgreSQL OAuth store in the local MCP harness.')
    parser.add_argument('--mcp-authority', action='store_true', help='Exercise the real external-access reader against an isolated projected binding.')
    parser.add_argument('--port', type=int, default=None)
    parser.add_argument('--redirect-uri', default='http://127.0.0.1:19335/auth/callback')
    parser.add_argument('--second-rp-redirect-uri', help='Register a second local test RP during --serve; credentials stay in the private fixture file.')
    args = parser.parse_args()
    if sum((args.otp_smoke, args.mcp_smoke, args.two_rp_smoke)) > 1:
        parser.error('--otp-smoke, --mcp-smoke and --two-rp-smoke are mutually exclusive')
    if args.mcp_pg and not (args.mcp_smoke or args.serve):
        parser.error('--mcp-pg requires --mcp-smoke or --serve')
    if args.mcp_authority and not args.mcp_pg:
        parser.error('--mcp-authority requires --mcp-pg')
    if args.second_rp_redirect_uri and not args.serve:
        parser.error('--second-rp-redirect-uri requires --serve')
    binaries = server_bin()
    pnpm = shutil.which('pnpm')
    if not pnpm:
        raise RuntimeError('pnpm is required.')
    # Allow only host tooling variables; never inherit cloud/provider/issuer credentials.
    allowed = {'PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'TMPDIR', 'LANG', 'LC_ALL', 'VOLTA_HOME', 'PNPM_HOME'}
    env = {key: value for key, value in os.environ.items() if key in allowed}
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    env.update(GREENHOUSE_POSTGRES_HOST='127.0.0.1',
               GREENHOUSE_POSTGRES_PORT=str(port),
               GREENHOUSE_POSTGRES_DATABASE='auth_first_party_ephemeral',
               GREENHOUSE_POSTGRES_USER='greenhouse_app',
               GREENHOUSE_POSTGRES_PASSWORD='ephemeral-local-only',
               GREENHOUSE_POSTGRES_SSL='false', FIRST_PARTY_EPHEMERAL_TEST='true', RUN_DB_TESTS='true')
    with tempfile.TemporaryDirectory(prefix='auth_first_party-pg-') as directory:
        temporary = Path(directory)
        data = temporary / 'data'
        started = False
        try:
            run([binaries / 'initdb', '-D', data, '-A', 'trust', '--no-locale', '-U', 'auth_first_party_test_admin'],
                env=env, stdout=subprocess.DEVNULL)
            run([binaries / 'pg_ctl', '-D', data, '-l', temporary / 'server.log',
                 '-o', f'-h 127.0.0.1 -p {port} -k {temporary}', 'start'],
                env=env, stdout=subprocess.DEVNULL)
            started = True
            admin = [binaries / 'psql', '-h', '127.0.0.1', '-p', str(port),
                     '-U', 'auth_first_party_test_admin', '-v', 'ON_ERROR_STOP=1']
            run(admin + ['-d', 'postgres', '-c', 'CREATE DATABASE auth_first_party_ephemeral'],
                env=env, stdout=subprocess.DEVNULL)
            setup = """
CREATE ROLE greenhouse_ops;
CREATE ROLE greenhouse_runtime;
CREATE ROLE greenhouse_migrator_user;
CREATE ROLE greenhouse_app LOGIN;
GRANT greenhouse_runtime TO greenhouse_app;
CREATE SCHEMA greenhouse_auth AUTHORIZATION greenhouse_ops;
CREATE SCHEMA greenhouse_core AUTHORIZATION greenhouse_ops;
GRANT USAGE ON SCHEMA greenhouse_auth,greenhouse_core TO greenhouse_runtime;
""" + (ROOT / 'scripts/auth-server/first-party-local-fixture.sql').read_text()
            run(admin + ['-d', 'auth_first_party_ephemeral'], input=setup, text=True,
                env=env, stdout=subprocess.DEVNULL)
            migration = (ROOT / 'migrations/20261025212915003_task-1834-first-party-oidc.sql').read_text()
            run(admin + ['-d', 'auth_first_party_ephemeral'], input=migration.split('-- Down Migration')[0],
                text=True, env=env, stdout=subprocess.DEVNULL)
            if args.mcp_pg:
                # The base fixture has a minimal audit table. Replace it with the real TASK-1829 OAuth DDL.
                oauth_prerequisites = """
DROP TABLE greenhouse_auth.oauth_audit_events;
CREATE FUNCTION greenhouse_auth.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$ LANGUAGE plpgsql;
"""
                oauth_migration = (ROOT / 'migrations/20260904130826694_task-1829-auth-oauth-tables.sql').read_text()
                run(admin + ['-d', 'auth_first_party_ephemeral'],
                    input=oauth_prerequisites + oauth_migration.split('-- Down Migration')[0],
                    text=True, env=env, stdout=subprocess.DEVNULL)
                # TASK-1836 adds context-aware columns. This local projection exercises the NULL-context
                # branch used by B10; it does not stand in for the full TASK-1836 migration.
                context_projection = """
CREATE TABLE greenhouse_auth.authorization_contexts (context_id uuid PRIMARY KEY);
ALTER TABLE greenhouse_auth.authorization_codes ADD COLUMN authorization_context_id uuid REFERENCES greenhouse_auth.authorization_contexts(context_id);
ALTER TABLE greenhouse_auth.refresh_tokens ADD COLUMN authorization_context_id uuid REFERENCES greenhouse_auth.authorization_contexts(context_id);
ALTER TABLE greenhouse_auth.refresh_tokens ADD COLUMN auth_time timestamptz;
ALTER TABLE greenhouse_auth.access_tokens ADD COLUMN authorization_context_id uuid REFERENCES greenhouse_auth.authorization_contexts(context_id);
ALTER TABLE greenhouse_auth.client_consents ADD COLUMN authorization_context_id uuid REFERENCES greenhouse_auth.authorization_contexts(context_id);
DROP INDEX greenhouse_auth.client_consents_active_uidx;
CREATE UNIQUE INDEX client_consents_active_uidx ON greenhouse_auth.client_consents
  (environment_id, subject, client_id, scope, COALESCE(authorization_context_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'active';
"""
                run(admin + ['-d', 'auth_first_party_ephemeral'], input=context_projection,
                    text=True, env=env, stdout=subprocess.DEVNULL)
                if args.mcp_authority:
                    authority_projection = (ROOT / 'scripts/auth-server/external-access-local-projection.sql').read_text()
                    run(admin + ['-d', 'auth_first_party_ephemeral'], input=authority_projection,
                        text=True, env=env, stdout=subprocess.DEVNULL)
            if args.otp or args.otp_smoke:
                fixture = "CREATE SCHEMA greenhouse_notifications; CREATE TABLE greenhouse_notifications.email_type_config (email_type text PRIMARY KEY,enabled boolean NOT NULL,paused_reason text);"
                otp = (ROOT / 'migrations/20261025213415654_task-2067-invitation-email-otp.sql').read_text()
                run(admin + ['-d', 'auth_first_party_ephemeral'], input=fixture + otp.split('-- Down Migration')[0],
                    text=True, env=env, stdout=subprocess.DEVNULL)
            if args.serve or args.otp_smoke or args.mcp_smoke or args.two_rp_smoke:
                env.update(AUTH_FIRST_PARTY_HARNESS_PORT=str(args.port or (19336 if args.otp or args.otp_smoke else 19334)),
                           AUTH_FIRST_PARTY_HARNESS_OTP=str(args.otp or args.otp_smoke).lower(),
                           AUTH_FIRST_PARTY_HARNESS_OTP_SMOKE=str(args.otp_smoke).lower(),
                           AUTH_FIRST_PARTY_HARNESS_MCP_SMOKE=str(args.mcp_smoke).lower(),
                           AUTH_FIRST_PARTY_HARNESS_TWO_RP_SMOKE=str(args.two_rp_smoke).lower(),
                           AUTH_FIRST_PARTY_HARNESS_MCP_PG=str(args.mcp_pg).lower(),
                           AUTH_FIRST_PARTY_HARNESS_MCP_AUTHORITY=str(args.mcp_authority).lower(),
                           AUTH_FIRST_PARTY_HARNESS_REDIRECT_URI=args.redirect_uri,
                           AUTH_FIRST_PARTY_HARNESS_SECOND_REDIRECT_URI=args.second_rp_redirect_uri or '',
                           AUTH_FIRST_PARTY_HARNESS_CONFIG_PATH=str(temporary / 'issuer-fixture.json'),
                           NODE_OPTIONS='--conditions=react-server')
                run([pnpm, 'exec', 'tsx', 'scripts/auth-server/first-party-local-server.ts'], cwd=ROOT, env=env)
            else:
                run([pnpm, 'exec', 'vitest', 'run', 'src/lib/auth-server/first-party/local-pg.test.ts'], cwd=ROOT, env=env)
        finally:
            if started:
                run([binaries / 'pg_ctl', '-D', data, 'stop', '-m', 'fast'],
                    env=env, stdout=subprocess.DEVNULL)
                print('Ephemeral local PostgreSQL stopped; temporary data removed on exit.')


if __name__ == '__main__':
    main()
