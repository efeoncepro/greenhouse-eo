"""TASK-2069: provision only the dedicated Rooms identity; no keys or application activation."""
import argparse,json,subprocess,sys
PROJECT='efeonce-group'
NUMBER='183008134038'
SA='rooms-runtime-production@efeonce-group.iam.gserviceaccount.com'
POOL='rooms-vercel'
SUB='owner:efeonce-7670142f:project:efeonce-rooms:environment:production'
ISSUER='https://oidc.vercel.com/efeonce-7670142f'
AUD='https://vercel.com/efeonce-7670142f'
CONDITION="assertion.sub == '"+SUB+"' && assertion.project_id == 'prj_9iaZv8FXdhvtC68r30OS3H4o3iJo' && assertion.owner_id == 'team_gmNiF4YCHmc1wqsHUTCvqjmN' && assertion.environment == 'production'"
MEMBER=f'principal://iam.googleapis.com/projects/{NUMBER}/locations/global/workloadIdentityPools/{POOL}/subject/{SUB}'

def call(args,missing=False):
 p=subprocess.run(['gcloud',*args,'--project='+PROJECT,'--format=json','--quiet'],capture_output=True,text=True)
 if p.returncode:
  if missing and ('NOT_FOUND' in p.stderr or 'not exist' in p.stderr): return None
  raise RuntimeError('gcloud operation failed; provider details omitted')
 return json.loads(p.stdout) if p.stdout.strip() else {}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 print(json.dumps({'mode':'apply' if args.apply else 'plan','project':PROJECT,'serviceAccount':SA,'pool':POOL,'provider':'production','subject':SUB}))
 if not args.apply:return
 sa=call(['iam','service-accounts','describe',SA],True)
 if sa is None:sa=call(['iam','service-accounts','create','rooms-runtime-production','--display-name=Rooms production runtime'])
 if sa.get('email')!=SA or sa.get('disabled',False):raise RuntimeError('Unexpected or disabled service account')
 pool=call(['iam','workload-identity-pools','describe',POOL,'--location=global'],True)
 if pool is None:
  call(['iam','workload-identity-pools','create',POOL,'--location=global','--display-name=Rooms Vercel production'])
  pool=call(['iam','workload-identity-pools','describe',POOL,'--location=global'])
 if pool.get('state')!='ACTIVE':raise RuntimeError('Pool not active')
 providerArgs=['--location=global','--workload-identity-pool='+POOL]
 provider=call(['iam','workload-identity-pools','providers','describe','production',*providerArgs],True)
 if provider is None:provider=call(['iam','workload-identity-pools','providers','create-oidc','production',*providerArgs,'--issuer-uri='+ISSUER,'--allowed-audiences='+AUD,'--attribute-mapping=google.subject=assertion.sub','--attribute-condition='+CONDITION])
 provider=call(['iam','workload-identity-pools','providers','describe','production',*providerArgs])
 if provider.get('state')!='ACTIVE' or provider.get('attributeCondition')!=CONDITION or provider.get('attributeMapping')!={'google.subject':'assertion.sub'} or provider.get('oidc',{}).get('issuerUri')!=ISSUER or provider.get('oidc',{}).get('allowedAudiences')!=[AUD]:raise RuntimeError('Provider differs; no overwrite allowed')
 call(['iam','service-accounts','add-iam-policy-binding',SA,'--role=roles/iam.workloadIdentityUser','--member='+MEMBER])
 call(['projects','add-iam-policy-binding',PROJECT,'--role=roles/cloudsql.client','--member=serviceAccount:'+SA,'--condition=None'])
 policy=call(['iam','service-accounts','get-iam-policy',SA])
 bindings=[b for b in policy.get('bindings',[]) if b.get('role')=='roles/iam.workloadIdentityUser']
 if not any(MEMBER in b.get('members',[]) for b in bindings):raise RuntimeError('WIF binding readback failed')
 print(json.dumps({'identityReady':True,'provider':provider['name'],'serviceAccount':SA,'productionSubjectOnly':all(b.get('members')==[MEMBER] for b in bindings),'keysCreated':0,'applicationEnabled':False}))
if __name__=='__main__':
 try:main()
 except Exception as error:print(json.dumps({'error':str(error) if isinstance(error,RuntimeError) else 'Unexpected provisioning failure'}));sys.exit(1)
