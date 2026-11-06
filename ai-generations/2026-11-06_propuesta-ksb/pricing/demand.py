import json, sys
from decimal import Decimal, ROUND_DOWN
k = sys.argv[1]
d = json.load(open(k+'.scaffold.json'))['demand']
lines = d['brief']['lines']
fte = {l['lineId']: Decimal(l['dedication']['value']) for l in lines}
P = list(range(1, 13))
EV = {"reference": "KSB 2027: plan, asientos y parte declarados por la práctica; sin factura ni registro de asientos verificado",
      "effectiveFrom": "2026-11-01", "effectiveUntil": "2027-12-31", "status": "estimated"}
def share(a, t):
    q = (Decimal(a)/Decimal(t)).quantize(Decimal('1e-18'), rounding=ROUND_DOWN)
    s = format(q.normalize(), 'f')
    return s
def alloc(tool, price, qty, unit, total, part, reason):
    return {"periodIds": P, "toolId": tool, "priceId": price, "quantity": str(qty), "serviceShare": share(part, total),
            "driver": {"unit": unit, "totalUnits": str(total), "allocatedUnits": str(part)}, "reason": reason, "evidence": EV}
n = len(lines); tot = sum(fte.values())
al = [alloc('notion','current',n,'declared-fte-share',n,tot,f'{n} asientos, uno por persona; KSB carga {tot} de {n}, la dedicación declarada.'),
      alloc('microsoft-365','current',n,'declared-fte-share',n,tot,f'{n} asientos, uno por persona; KSB carga {tot} de {n}, la dedicación declarada.')]
tools = [q['path'] for q in json.load(open(k+'.scaffold.json'))['questions'] if q['code'].startswith('TOOL')]
if 'zapier' in tools:
    al.append(alloc('zapier','historical',1,'plan-share-conservative',1,1,'Un plan para automatizar el traspaso de leads a SAP C4C; supuesto conservador: KSB carga el plan completo. Precio histórico: el vigente no tiene monto.'))
if 'metricool' in tools:
    al.append(alloc('metricool','historical',1,'plan-share-conservative',1,1,'Un plan para programar y medir LinkedIn, Instagram, Facebook y YouTube; supuesto conservador: KSB carga el plan completo. Precio histórico: el vigente no tiene monto.'))
if 'frame-io' in tools:
    v = fte.get('video', Decimal('0.2'))
    al.append(alloc('frame-io','historical',1,'declared-fte-share',1,v,f'Revisión de video; KSB carga {v} de 1, la dedicación del editor. Precio histórico: el vigente no tiene monto.'))
if 'adobe' in tools:
    v = fte.get('diseno',0)+fte.get('video',0)
    a=alloc('adobe','current',1,'assigned-user-seat',3,v,f'Diseño y video usan licencias del paquete de tres; KSB carga {v} de 3, su dedicación declarada.'); a['seatCapacity']=3; al.append(a)
if 'adobe-express' in tools:
    v = fte.get('social',0)
    a=alloc('adobe-express','current',1,'assigned-user-seat',3,v,f'Redes diseña piezas simples con una licencia de Express del paquete de tres; KSB carga {v} de 3.'); a['seatCapacity']=3; al.append(a)
d['allocations'] = al
if 'adobe' in tools or 'adobe-express' in tools: d['fxRecordIds'] = ['fx:CLP:USD']
json.dump(d, open(k+'.demand.json','w'), ensure_ascii=False, indent=2)
