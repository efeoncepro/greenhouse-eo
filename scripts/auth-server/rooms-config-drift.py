"""Compare Rooms rollout config against revision metadata; never print secret values."""
import json
import os
import sys


FLAGS = ('AUTH_SERVER_FIRST_PARTY_ENABLED', 'AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED')
VALUES = ('AUTH_SERVER_INVITATION_EMAIL_OTP_CLIENT_ID', 'AUTH_SERVER_INVITATION_EMAIL_OTP_ROOMS_ORIGIN')
SECRETS = ('AUTH_SERVER_INVITATION_EMAIL_OTP_HMAC_SECRET', 'ROOMS_INVITATION_AUTHORITY_TOKEN')


def secret_ref(value, project='efeonce-group'):
    if value.startswith('projects/'):
        parts = value.split('/')
        if len(parts) != 6 or parts[1] != project or parts[2] != 'secrets' or parts[4] != 'versions':
            return None
        return parts[3], parts[5]
    parts = value.split(':')
    if len(parts) == 1 and parts[0]:
        return parts[0], 'latest'
    if len(parts) == 2 and all(parts):
        return tuple(parts)
    return None


def config_matches(revision, desired):
    containers = revision.get('spec', {}).get('containers', [])
    if len(containers) != 1:
        return False
    env = {entry['name']: entry for entry in containers[0].get('env', [])}
    for name in FLAGS:
        wanted = desired.get(name, 'false')
        if wanted not in ('true', 'false') or env.get(name, {}).get('value', 'false') != wanted:
            return False
    for name in VALUES:
        if env.get(name, {}).get('value', '') != desired.get(name, ''):
            return False
    if desired.get('AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED', 'false') == 'true':
        if desired.get('AUTH_SERVER_FIRST_PARTY_ENABLED') != 'true' or not all(desired.get(name) for name in VALUES):
            return False
        for name in SECRETS:
            wanted = secret_ref(desired.get(name + '_REF', ''), desired.get('GCP_PROJECT_ID', 'efeonce-group'))
            mounted = env.get(name, {}).get('valueFrom', {}).get('secretKeyRef', {})
            if wanted is None or (mounted.get('name'), mounted.get('key')) != wanted:
                return False
    return True


if __name__ == '__main__':
    try:
        print('true' if config_matches(json.load(sys.stdin), os.environ) else 'false')
    except (ValueError, KeyError, TypeError):
        # Missing/malformed metadata must require a deploy, never skip it.
        print('false')
