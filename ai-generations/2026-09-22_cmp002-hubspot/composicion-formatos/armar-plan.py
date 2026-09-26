# Arma piezas-formatos.json desde el plan 4:5 aprobado (composicion/piezas.json).
# Copy, CTA y descriptor se heredan tal cual; cambia sólo el layout por formato.
# `subjectProtection` sale de protecciones.json, medido a ojo sobre la regla de cada plate
# (EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md §11). Sin medición, la pieza no se compone.
import json, copy, sys, os
here = os.path.dirname(os.path.abspath(__file__))
base = json.load(open(os.path.join(here, '../composicion/piezas.json'), encoding='utf-8'))
prot = json.load(open(os.path.join(here, 'protecciones.json'), encoding='utf-8'))
ajustes = json.load(open(os.path.join(here, 'ajustes.json'), encoding='utf-8')) if os.path.exists(os.path.join(here, 'ajustes.json')) else {}
FORMATOS = {
  '916': dict(final=[1152, 2048], textWidth=0.84, top=0.12, leadSize=36, afterSize=34, dominantSize=150,
              dominantMax=0.84, logo={'width': 0.2, 'x': 0.5, 'y': 0.82, 'variant': 'auto'}, cta=dict(fontSize=40, descriptorSize=28)),
  '169': dict(final=[2048, 1152], textWidth=0.40, top=0.10, leadSize=28, afterSize=25, dominantSize=112,
              dominantMax=0.40, logo={'width': 0.13, 'x': 0.5, 'variant': 'auto'}, cta=dict(fontSize=30, descriptorSize=20)),
  '11':  dict(final=[1080, 1080], textWidth=0.84, top=0.05, leadSize=30, afterSize=30, dominantSize=110,
              dominantMax=0.84, logo={'width': 0.18, 'x': 0.5, 'variant': 'auto'}, cta=dict(fontSize=36, descriptorSize=24)),
}
out = []
for p in base:
    for suf, f in FORMATOS.items():
        pid = f"{p['id']}-{suf}"
        if pid not in prot:
            continue
        q = copy.deepcopy(p)
        q['id'] = pid
        q['plate'] = f'plates/{pid}.png'
        for k in ('final', 'textWidth', 'top', 'leadSize', 'afterSize', 'dominantSize', 'dominantMax', 'logo'):
            q[k] = copy.deepcopy(f[k])
        q['cta'].update(f['cta'])
        # los ajustes finos (tamaño del dominante, gaps) van por pieza y quedan a la vista en ajustes.json
        for k, v in ajustes.get(pid, {}).items():
            if k == 'cta': q['cta'].update(v)
            else: q[k] = v
        q['subjectProtection'] = prot[pid]
        out.append(q)
json.dump(out, open(os.path.join(here, 'piezas-formatos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(len(out), 'piezas')
