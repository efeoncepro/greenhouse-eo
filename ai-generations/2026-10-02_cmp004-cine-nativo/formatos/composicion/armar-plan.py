# Arma los planes por formato desde los planes 4:5 aprobados (composicion/ y composicion-bf/).
# Copy, CTA, voz, política de color y alt se heredan tal cual; cambia sólo el layout del formato.
# Uso: python3 armar-plan.py 916 11 191   (escribe piezas-<fmt>.json con las piezas cuyo plate ya existe)
import json, copy, os, sys
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(H, '..', '..')
base = json.load(open(os.path.join(R, 'composicion/piezas.json'))) + json.load(open(os.path.join(R, 'composicion-bf/piezas.json')))
ajustes = json.load(open(os.path.join(H, 'ajustes.json'))) if os.path.exists(os.path.join(H, 'ajustes.json')) else {}
FORMATOS = json.load(open(os.path.join(H, 'formatos.json')))
for suf in sys.argv[1:]:
    f = FORMATOS[suf]; out = []
    for p in base:
        clave = p['id'].split('-')[1]                     # S01 … BF3
        pid = f"CMP004-{clave}-KV-{suf}-N1"
        plate = f"plates/{pid}.png"
        if not os.path.exists(os.path.join(H, plate)): continue
        q = copy.deepcopy(p); q['id'] = pid; q['plate'] = plate
        for k, v in f['layout'].items(): q[k] = copy.deepcopy(v)
        q['cta'].update(f.get('cta', {}))
        for k, v in ajustes.get(pid, {}).items():
            if k == 'cta': q['cta'].update(v)
            else: q[k] = v
        out.append(q)
    json.dump(out, open(os.path.join(H, f'piezas-{suf}.json'), 'w'), ensure_ascii=False, indent=2)
    print(suf, len(out), 'piezas')
