"""Execute one explicitly selected, reviewed CLI request; retain raw output and receipt.

Usage: python3 .../run-own-image.py GF26-A --run
Never overwrites an output. Credentials stay with the canonical CLI resolver.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import time
from datetime import datetime, timezone

if len(sys.argv) != 3 or sys.argv[2] != '--run':
    raise SystemExit('Expected reviewed request id and --run')
image_id = sys.argv[1]
if not re.fullmatch(r'GF26-[AB](?:-edit[12])?', image_id):
    raise SystemExit('Unexpected request id')
base = Path('ai-generations/2026-11-05_glitch-flash-images-2-6/pruebas-propias')
request = json.loads((base / f'{image_id}-request.json').read_text())
target = base / 'plates' / f'{image_id}.png'
if target.exists() or (base / f'{image_id}-receipt.json').exists():
    raise SystemExit('Existing output or receipt: inspect before any new paid attempt')
prompt_path = Path(request['promptFile'])
if hashlib.sha256(prompt_path.read_bytes()).hexdigest() != request['promptSha256']:
    raise SystemExit('Prompt changed since reviewed request')
for ref in request['references']:
    if hashlib.sha256(Path(ref['path']).read_bytes()).hexdigest() != ref['sha256']:
        raise SystemExit('Reference changed since reviewed request')
args = ['pnpm', '-s', 'ai:image', '--model', request['model'], '--quality', request['quality'],
        '--complexity', request['complexity'], '--size', request['size'], '--format', 'png',
        '--background', 'opaque', '--count', '1', '--timeout', '280000',
        '--prompt-file', str(prompt_path), '--out', str(target)]
for ref in request['references']:
    args.extend(['--image', ref['path']])
if request.get('markup'):
    mark = request['markup']
    if hashlib.sha256(Path(mark['path']).read_bytes()).hexdigest() != mark['sha256']:
        raise SystemExit('Markup changed since reviewed request')
    args.extend(['--markup', mark['path']])
started = datetime.now(timezone.utc).isoformat()
t0 = time.perf_counter()
result = subprocess.run(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
duration = time.perf_counter() - t0
log = result.stdout
(base / 'logs' / f'{image_id}.log').write_text(log)
usage = re.search(r'usage: in (\d+) \(img (\d+) · txt (\d+)\) · out (\d+) · total (\d+)', log)
tokens = dict(zip(['input_tokens','image_input_tokens','text_input_tokens','output_tokens','total_tokens'],
                  map(int, usage.groups()))) if usage else None
success = re.search(r'✓ \d+KB · ([^\s·]+) · ([^\s·]+) · ([^\s·]+)', log)
record = {'id': image_id, 'startedUtc': started, 'elapsedCliSeconds': round(duration, 3),
          'measurement': 'CLI wall time including process, credential resolution, upload, provider and file write; not provider latency',
          'exitCode': result.returncode, 'file': str(target), 'fileExists': target.exists(),
          'bytes': target.stat().st_size if target.exists() else None,
          'sha256': hashlib.sha256(target.read_bytes()).hexdigest() if target.exists() else None,
          'modelRequested': request['model'], 'modelReadback': success.group(1) if success else None,
          'quality': request['quality'], 'complexity': request['complexity'], 'sizeRequested': request['size'],
          'usage': tokens, 'postprocessing': 'none; raw CLI provider output',
          'parent': request.get('parent'), 'request': f'{image_id}-request.json'}
(base / f'{image_id}-receipt.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n')
print(log)
print(json.dumps(record, ensure_ascii=False, indent=2))
if not record['fileExists'] or record['modelReadback'] is None:
    raise SystemExit(1)
