"""TASK-2069: exact Production metadata/secret references, with access lanes OFF."""
import argparse,json,subprocess,sys
PROJECT='prj_9iaZv8FXdhvtC68r30OS3H4o3iJo'
TEAM='team_gmNiF4YCHmc1wqsHUTCvqjmN'
SCOPE='efeonce-7670142f'
ENV={
 'ROOMS_RUNTIME_PROFILE':'cloud-production','ROOMS_VERCEL_OWNER_ID':TEAM,
 'ROOMS_GCP_WIF_PROVIDER':'projects/183008134038/locations/global/workloadIdentityPools/rooms-vercel/providers/production',
 'ROOMS_GCP_SERVICE_ACCOUNT':'rooms-runtime-production@efeonce-group.iam.gserviceaccount.com',
 'ROOMS_CLOUD_SQL_INSTANCE':'efeonce-group:us-east4:greenhouse-pg-dev',
 'ROOMS_POSTGRES_DATABASE':'rooms_production','ROOMS_POSTGRES_USER':'rooms_runtime',
 'ROOMS_AUTH_ISSUER':'https://auth.efeonce.org','ROOMS_AUTH_ORIGIN':'https://efeonce-rooms.vercel.app',
 'ROOMS_AUTH_CLIENT_ID':'efeonce-rp-rooms-production','ROOMS_AUTH_ALLOW_LOCAL_DEVELOPMENT':'false',
 'ROOMS_FIRST_PARTY_AUTH_ENABLED':'false','ROOMS_INVITATIONS_ENABLED':'false',
}
for key,name in {
 'ROOMS_POSTGRES_PASSWORD_SECRET_REF':'postgres-runtime-password',
 'ROOMS_AUTH_CLIENT_SECRET_SECRET_REF':'auth-client-secret',
 'ROOMS_AUTH_ENCRYPTION_KEY_SECRET_REF':'auth-encryption-key',
 'ROOMS_INVITATION_ENCRYPTION_KEY_SECRET_REF':'invitation-encryption-key',
 'ROOMS_INVITATION_AUTHORITY_TOKEN_SECRET_REF':'invitation-authority-token',
}.items():ENV[key]=f'projects/efeonce-group/secrets/rooms-production-{name}/versions/1'
FORBIDDEN=['GOOGLE_APPLICATION_CREDENTIALS','GOOGLE_CREDENTIALS','GOOGLE_SERVICE_ACCOUNT_KEY','GCP_SERVICE_ACCOUNT_KEY','ROOMS_DATABASE_URL','ROOMS_MIGRATION_DATABASE_URL','ROOMS_POSTGRES_PASSWORD','ROOMS_POSTGRES_MIGRATOR_PASSWORD','ROOMS_POSTGRES_MIGRATOR_PASSWORD_SECRET_REF','ROOMS_AUTH_CLIENT_SECRET','ROOMS_AUTH_ENCRYPTION_KEY','ROOMS_INVITATION_ENCRYPTION_KEY','ROOMS_INVITATION_AUTHORITY_TOKEN']
def api(path,body=None):
 args=['vercel','api',path,'--scope',SCOPE,'--raw']
 if body is not None:args+=['-X','POST','-H','Content-Type: application/json','--input','-']
 p=subprocess.run(args,input=json.dumps(body) if body is not None else None,capture_output=True,text=True)
 if p.returncode:raise RuntimeError('Vercel request failed; raw output omitted')
 data=json.loads(p.stdout)
 if isinstance(data,dict) and data.get('error'):raise RuntimeError('Vercel rejected configuration')
 return data

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 project=api(f'/v9/projects/{PROJECT}?teamId={TEAM}')
 if project.get('id')!=PROJECT or project.get('accountId')!=TEAM or project.get('name')!='efeonce-rooms':raise RuntimeError('Unexpected project')
 if project.get('autoExposeSystemEnvs') is not True:raise RuntimeError('System environment exposure must be verified')
 if project.get('oidcTokenConfig',{}).get('enabled') is not True or project.get('oidcTokenConfig',{}).get('issuerMode')!='team':raise RuntimeError('OIDC configuration mismatch')
 def production():return [v for v in api(f'/v9/projects/{PROJECT}/env?teamId={TEAM}').get('envs',[]) if 'production' in v.get('target',[])]
 existing=production()
 blocked=sorted(v['key'] for v in existing if v['key'] in FORBIDDEN)
 if blocked:raise RuntimeError('Forbidden production variables exist: '+','.join(blocked))
 # Refuse to turn off an existing enabled pilot as an incidental preparation step.
 if any(v['key'] in ['ROOMS_FIRST_PARTY_AUTH_ENABLED','ROOMS_INVITATIONS_ENABLED'] and api(f"/v1/projects/{PROJECT}/env/{v['id']}?teamId={TEAM}").get('value')!='false' for v in existing):raise RuntimeError('Existing activation requires explicit rollout review')
 print(json.dumps({'mode':'apply' if args.apply else 'plan','project':PROJECT,'target':'production','keys':sorted(ENV),'existingKeys':sorted(v['key'] for v in existing),'flagsEnabled':False,'secretPayloads':False}))
 if not args.apply:return
 for key,value in ENV.items():
  result=subprocess.run(['vercel','env','add',key,'production','--scope',SCOPE,'--force'],input=value,capture_output=True,text=True,cwd='/Users/jreye/Documents/efeonce-rooms')
  if result.returncode:raise RuntimeError('Environment write failed for '+key+'; inspect before retry')
 observed={v['key']:v for v in production()}
 # Read only these public metadata/ref values; never request decrypted NPM_RC or credentials.
 if any(k not in observed or observed[k].get('target')!=['production'] for k in ENV):raise RuntimeError('Environment metadata readback mismatch')
 for key,value in ENV.items():
  if api(f"/v1/projects/{PROJECT}/env/{observed[key]['id']}?teamId={TEAM}").get('value')!=value:raise RuntimeError('Environment value mismatch: '+key)
 print(json.dumps({'configured':len(ENV),'productionOnly':True,'deploymentCreated':False,'valueReadback':'exact; runtime consumption pending'}))
if __name__=='__main__':
 try:main()
 except Exception as error:print(json.dumps({'failed':str(error) if isinstance(error,RuntimeError) else 'Configuration failed; raw details omitted'}));sys.exit(1)
