#!/usr/bin/env python3
"""TASK-1950: isolated local PostgreSQL contract test; never reads live DB config."""
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
    binaries = server_bin()
    pnpm = shutil.which('pnpm')
    if not pnpm:
        raise RuntimeError('pnpm is required.')
    env = {key: value for key, value in os.environ.items()
           if not key.startswith(('GREENHOUSE_POSTGRES_', 'PG')) and key != 'DATABASE_URL'}
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    env.update(GREENHOUSE_POSTGRES_HOST='127.0.0.1',
               GREENHOUSE_POSTGRES_PORT=str(port),
               GREENHOUSE_POSTGRES_DATABASE='xray_ephemeral',
               GREENHOUSE_POSTGRES_USER='greenhouse_runtime',
               GREENHOUSE_POSTGRES_PASSWORD='ephemeral-local-only',
               GREENHOUSE_POSTGRES_SSL='false', XRAY_EPHEMERAL_TEST='true')
    with tempfile.TemporaryDirectory(prefix='xray-pg-') as directory:
        temporary = Path(directory)
        data = temporary / 'data'
        started = False
        try:
            run([binaries / 'initdb', '-D', data, '-A', 'trust', '--no-locale', '-U', 'xray_test_admin'],
                env=env, stdout=subprocess.DEVNULL)
            run([binaries / 'pg_ctl', '-D', data, '-l', temporary / 'server.log',
                 '-o', f'-h 127.0.0.1 -p {port} -k {temporary}', 'start'],
                env=env, stdout=subprocess.DEVNULL)
            started = True
            admin = [binaries / 'psql', '-h', '127.0.0.1', '-p', str(port),
                     '-U', 'xray_test_admin', '-v', 'ON_ERROR_STOP=1']
            run(admin + ['-d', 'postgres', '-c', 'CREATE DATABASE xray_ephemeral'],
                env=env, stdout=subprocess.DEVNULL)
            setup = '''
CREATE ROLE greenhouse_ops;
CREATE ROLE greenhouse_runtime LOGIN;
CREATE ROLE greenhouse_migrator_user;
CREATE SCHEMA greenhouse_core;
CREATE TABLE greenhouse_core.organizations(
 organization_id text PRIMARY KEY, active boolean DEFAULT true, status text DEFAULT 'active');
CREATE TABLE greenhouse_core.capabilities_registry(
 capability_key text PRIMARY KEY,module text,allowed_actions text[],allowed_scopes text[],
 description text,introduced_at timestamptz,deprecated_at timestamptz);
INSERT INTO greenhouse_core.organizations(organization_id) VALUES ('org-a'),('org-b');
GRANT USAGE ON SCHEMA greenhouse_core TO greenhouse_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA greenhouse_core TO greenhouse_runtime;
'''
            run(admin + ['-d', 'xray_ephemeral'], input=setup, text=True,
                env=env, stdout=subprocess.DEVNULL)
            migration = (ROOT / 'migrations/20260930140916208_task-1950-aeo-xray-editions-sharing.sql').read_text()
            run(admin + ['-d', 'xray_ephemeral'], input=migration.split('-- Down Migration')[0],
                text=True, env=env, stdout=subprocess.DEVNULL)
            run([pnpm, 'exec', 'vitest', 'run', 'src/lib/aeo-xray/local-pg.test.ts'], cwd=ROOT, env=env)
        finally:
            if started:
                run([binaries / 'pg_ctl', '-D', data, 'stop', '-m', 'fast'],
                    env=env, stdout=subprocess.DEVNULL)
                print('Ephemeral local PostgreSQL stopped; temporary data removed on exit.')


if __name__ == '__main__':
    main()
