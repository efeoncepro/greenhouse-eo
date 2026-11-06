# Briefs de documento (sólo textos) para las tres cotizaciones V3 del anexo económico KSB.
import json, copy
SUP = {"name": "Efeonce Group SpA", "taxId": "RUT 77.357.182-1", "contact": "Julio Reyes",
       "email": "jreyes@efeoncepro.com", "phone": "+56 9 3480 2860"}
BUY = {"name": "KSB Chile S.A.", "taxId": "RUT 96.691.060-7", "unit": "Gerencia de Marketing",
       "contact": "Nelson Urbano Meza, Gerente de Marketing"}
TAX = "Valores netos en pesos chilenos. El IVA se agrega al facturar, como piden las bases."
MEDIOS = {"title": "Medios", "text": "KSB paga los medios directo a Google, LinkedIn y Meta, en cuentas a su nombre. El monto es el mínimo que recomiendan las bases; sube sólo si la estrategia lo justifica y con aprobación de KSB. Efeonce no cobra comisión sobre los medios."}
MEDIOS_MIN = {"title": "Medios", "text": MEDIOS["text"].replace("Google, LinkedIn y Meta", "Google y LinkedIn")}
APORTA_C = {"title": "Lo que aporta KSB", "text": "Accesos a las cuentas de LinkedIn, Instagram, Facebook y YouTube; el material técnico y de productos; una persona que apruebe piezas y calendario; y respuestas técnicas a tiempo para la moderación."}
COMUNES = [
 {"title": "Plazo", "text": "Doce meses desde el inicio del servicio, con dos prórrogas posibles según las bases de la licitación."},
 {"title": "Forma de pago", "text": "Factura mensual por mes de servicio, al cierre de cada mes."},
 {"title": "Lo que aporta KSB", "text": "Accesos a GA4, Google Ads, Meta Ads Manager y lectura en SAP C4C; los históricos para la línea base; una persona que apruebe piezas y campañas; y la validación mensual de ventas con el área comercial."},
 {"title": "Vigencia", "text": "Noventa días desde la fecha de esta oferta."}]
SCHED = {"title": "Calendario", "phases": [
 {"label": "Diciembre de 2026", "title": "Plan y línea base", "text": "Plan de trabajo, accesos y auditoría de línea base con los históricos de KSB, en las fechas que fijan las bases."},
 {"label": "Enero a marzo de 2027", "title": "Arranque y rampa", "text": "Salida de campañas, ajuste semanal y primer comité trimestral contra los KPIs de la rampa."},
 {"label": "Abril a diciembre de 2027", "title": "Optimización y escala", "text": "Optimización por segmento y canal, y decisión de prórroga con los KPIs del año."}]}
def doc(ref, title, subtitle, service, intro, rows, pintro, psum, conds, label, detail):
    return {"schemaVersion": "pricing-v3-quote-document-brief/1", "reference": ref, "supplier": SUP, "buyer": BUY,
      "cover": {"label": "Borrador · Sin validez comercial", "title": title, "subtitle": subtitle, "netLabel": "Honorarios netos de 12 meses"},
      "service": {"name": service}, "scope": {"title": ["Alcance"], "intro": intro, "rows": rows},
      "schedule": copy.deepcopy(SCHED), "pricing": {"title": ["Oferta económica"], "intro": pintro, "summary": psum, "taxNote": TAX},
      "conditions": {"title": ["Condiciones"], "rows": conds},
      "lines": {"fee": {"label": label, "detail": detail, "group": "Servicio"}}}
D = {}
D["base-performance.v5"] = doc("KSB · LIC-MKT-2026-001 · Nivel Mínimo", ["Oferta económica", "Nivel Mínimo"],
  "Pauta en buscadores y LinkedIn con la captura de leads y su traspaso a SAP C4C. No incluye contenidos ni redes sociales.",
  "Agencia de Marketing Digital 2027 · Nivel Mínimo",
  "Lo que incluye el nivel Mínimo durante los doce meses del servicio.",
  [{"title": "Pauta en buscadores y LinkedIn", "text": "Campañas en Google Search y LinkedIn Ads para los segmentos de KSB, con optimización y control de presupuesto."},
   {"title": "Captura de leads", "text": "Una landing y los formularios nativos de LinkedIn, con el traspaso de cada lead a SAP C4C."},
   {"title": "Medición", "text": "Conversiones configuradas en las plataformas, reporte semanal de leads generados y convertidos, y reporte mensual."},
   {"title": "Cuenta", "text": "Una contraparte en Efeonce para KSB y una reunión mensual de resultados."},
   {"title": "Fuera de este nivel", "text": "Contenidos y redes sociales, Meta Ads y la estrategia por segmento. Esos servicios están en el nivel Esencial."}],
  "Honorarios de Efeonce por mes de servicio. Los medios se pagan aparte, directo a cada plataforma.",
  "Valor fijo mensual, sin porcentaje sobre los medios.",
  [MEDIOS_MIN] + [dict(c, text=c["text"].replace("Google Ads, Meta Ads Manager", "Google Ads, LinkedIn Campaign Manager")) for c in COMUNES], "Honorarios Efeonce · Pauta y leads", "Google Search y LinkedIn, leads a SAP C4C y medición")
D["ese-performance.v3"] = doc("KSB · LIC-MKT-2026-001 · Nivel Esencial · 1 de 2", ["Nivel Esencial", "Pauta y leads"],
  "SEM, LinkedIn y Meta, landings por línea de negocio, leads calificados en SAP C4C y medición del ROI. Es la primera de dos partes del nivel Esencial.",
  "Agencia de Marketing Digital 2027 · Nivel Esencial · Pauta y leads",
  "Lo que incluye la pauta y la generación de leads del nivel Esencial durante los doce meses del servicio.",
  [{"title": "Estrategia por segmento", "text": "Estrategia por segmento de KSB y rampa trimestral de KPIs, revisada en el comité mensual."},
   {"title": "Pauta", "text": "Google Search y LinkedIn Ads todo el año, y Meta en los periodos que pida la estrategia, con montaje, segmentación, lead ads y optimización."},
   {"title": "Generación de leads", "text": "Landings por línea de negocio, formularios y calificación de MQL, con el traspaso de cada lead a SAP C4C. Sin email masivo."},
   {"title": "Medición", "text": "GA4 y Google Tag Manager, conversiones offline desde las ventas de C4C, reporte semanal de leads generados y convertidos, y reporte mensual de ROI y ROAS."},
   {"title": "Cuenta", "text": "Una contraparte única en Efeonce, plan anual y comité mensual con la Gerencia de Marketing."}],
  "Honorarios de Efeonce por mes de servicio. El nivel Esencial suma esta oferta y la de Contenidos y redes. Los medios se pagan aparte, directo a cada plataforma.",
  "Valor fijo mensual, sin porcentaje sobre los medios.",
  [MEDIOS] + COMUNES, "Honorarios Efeonce · Pauta y leads", "SEM, LinkedIn y Meta, leads a SAP C4C y medición")
D["ese-creative.v2"] = doc("KSB · LIC-MKT-2026-001 · Nivel Esencial · 2 de 2", ["Nivel Esencial", "Contenidos y redes"],
  "Línea editorial técnica, publicaciones en LinkedIn, Instagram y Facebook, y video para YouTube. Es la segunda de dos partes del nivel Esencial.",
  "Agencia de Marketing Digital 2027 · Nivel Esencial · Contenidos y redes",
  "Lo que incluyen los contenidos y las redes sociales del nivel Esencial durante los doce meses del servicio.",
  [{"title": "Línea editorial", "text": "Línea editorial técnica para los segmentos de KSB y calendario mensual aprobado por la Gerencia de Marketing."},
   {"title": "Redes sociales", "text": "Dos publicaciones por semana en LinkedIn, Instagram y Facebook, cada una, con su moderación."},
   {"title": "Video", "text": "Un video al mes para YouTube, con sus cortes para redes."},
   {"title": "Diseño y textos", "text": "Las piezas de redes y de pauta, y los textos de publicaciones y anuncios."},
   {"title": "Propiedad", "text": "Las creatividades y estrategias son propiedad de KSB, según las bases."}],
  "Honorarios de Efeonce por mes de servicio. El nivel Esencial suma esta oferta y la de Pauta y leads.",
  "Valor fijo mensual, con la frecuencia de las bases.",
  [c if c["title"] != "Lo que aporta KSB" else APORTA_C for c in COMUNES], "Honorarios Efeonce · Contenidos y redes", "LinkedIn, Instagram, Facebook y YouTube")
for k, v in D.items():
    json.dump(v, open(k + ".document-brief.json", "w"), ensure_ascii=False, indent=2)
print(list(D))
