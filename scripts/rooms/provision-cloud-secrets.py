"""TASK-2069: create dedicated secrets once; no payload is printed or saved to files."""
import argparse,base64,json,secrets,subprocess,sys
PROJECT='efeonce-group';SA='rooms-runtime-production@efeonce-group.iam.gserviceaccount.com'
NAMES={'rooms-production-postgres-runtime-password':'url','rooms-production-postgres-migrator-password':'url','rooms-production-auth-encryption-key':'base64','rooms-production-invitation-encryption-key':'base64','rooms-production-invitation-authority-token':'url'}
def run(args,payload=None,missing=False):
 p=subprocess.run(['gcloud',*args,'--project='+PROJECT,'--quiet'],input=payload,capture_output=True)
 if p.returncode:
  if missing and b'NOT_FOUND' in p.stderr:return None
  raise RuntimeError('Secret operation failed; payload/response withheld')
 return p.stdout

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--apply',action='store_true');a=ap.parse_args()
 print(json.dumps({'mode':'apply' if a.apply else 'plan','names':list(NAMES),'clientSecretOwner':'Auth peer','runtimeHasMigratorSecret':False}),flush=True)
 if not a.apply:return
 for name,encoding in NAMES.items():
  existing=run(['secrets','describe',name,'--format=json'],missing=True)
  if existing is not None:raise RuntimeError('Secret already exists; inspect metadata rather than rotate: '+name)
  raw=secrets.token_bytes(32);value=(base64.b64encode(raw) if encoding=='base64' else base64.urlsafe_b64encode(raw).rstrip(b'='))
  run(['secrets','create',name,'--replication-policy=user-managed','--locations=us-east4','--labels=product=rooms,environment=production','--format=json'])
  version=json.loads(run(['secrets','versions','add',name,'--data-file=-','--format=json'],value))
  actual=run(['secrets','versions','access','1','--secret='+name])
  if actual!=value or value.strip()!=value:raise RuntimeError('Secret readback mismatch')
  if 'migrator' not in name:run(['secrets','add-iam-policy-binding',name,'--member=serviceAccount:'+SA,'--role=roles/secretmanager.secretAccessor','--format=json'])
  print(json.dumps({'secret':name,'version':version.get('name'),'verified':True,'runtimeAccessor':'migrator' not in name}),flush=True)
 # This exact peer-created secret is part of the RP contract; do not create or rotate it here.
 run(['secrets','add-iam-policy-binding','rooms-production-auth-client-secret','--member=serviceAccount:'+SA,'--role=roles/secretmanager.secretAccessor','--format=json'])
 print(json.dumps({'clientSecretAccessorGranted':True,'applicationEnabled':False}),flush=True)
if __name__=='__main__':
 try:main()
 except Exception as e:print(json.dumps({'error':str(e) if isinstance(e,RuntimeError) else 'Unexpected secret operation failure'}));sys.exit(1)
