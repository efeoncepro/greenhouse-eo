import json, sys
EV = lambda ref: {"reference": ref, "effectiveFrom": "2026-11-01", "effectiveUntil": "2027-12-31", "status": "estimated"}
def brief(acc, offer, lines, periods=12):
    return {"schemaVersion":"pricing-v3-brief/1","mode":"simulation","quoteDate":"2026-11-06","offerId":offer,
      "engagementCode":"monthly","engagementForm":"on_going","accountId":acc,"offerMarketCountry":"CL",
      "outputCurrency":"CLP","periods":periods,"adjustments":[],"taxTreatment":{"kind":"not_resolved"},
      "lines":[{"lineId":i,"profile":p,"talentCountry":"CL","headcount":1,"dedication":{"unit":"fte","value":f},
        "dedicationEvidence":EV(("KSB 2027, estimado: "+r)[:120]),
        "allocationMode":"shared","allocationPolicyId":"allocation:shared","kitId":"managed-service-core","choices":[]}
        for i,p,f,r in lines]}
SETS = {
 "rec-performance": ("ksb-rec-performance","performance-commerce-distribution",[
   ("cuenta","ECG-016","0.30","contraparte única, plan anual, comité mensual y validaciones"),
   ("estrategia","ECG-022","0.15","estrategia por segmento (minería, agua, riego, distribuidores) y rampa de KPIs"),
   ("paid","ECG-008","0.30","Google Search/Demand Gen, LinkedIn y Meta; optimización y presupuesto"),
   ("trafficker","ECG-009","0.25","montaje, segmentación, lead ads y conversiones"),
   ("leadgen","ECG-021","0.25","landings, formularios, calificación MQL, traspaso a SAP C4C"),
   ("analitica","ECG-031","0.20","GA4/GTM, conversiones offline, tablero semanal y reporte mensual")]),
 "rec-creative": ("ksb-rec-creative","creative-managed-service",[
   ("contenido","ECG-010","0.30","línea editorial técnica, calendario y casos"),
   ("social","ECG-006","0.35","LinkedIn, Instagram y Facebook 2–3 publicaciones/semana cada una, moderación"),
   ("diseno","ECG-003","0.35","piezas sociales y de pauta (~36/mes)"),
   ("copy","ECG-011","0.20","textos de publicaciones, anuncios y landings"),
   ("video","ECG-018","0.20","1–2 videos/mes para YouTube y cortes")]),
 "base-performance": ("ksb-base-performance","performance-commerce-distribution",[
   ("cuenta","ECG-016","0.08","contraparte y reporte mensual"),
   ("paid","ECG-008","0.15","Google Search y LinkedIn, optimización"),
   ("leadgen","ECG-021","0.08","una landing y formularios nativos, traspaso a C4C"),
   ("analitica","ECG-031","0.05","conversiones y reporte mensual")]),
 "ese-performance": ("ksb-ese-performance","performance-commerce-distribution",[
   ("cuenta","ECG-016","0.15","contraparte única, plan anual y comité mensual"),
   ("estrategia","ECG-022","0.08","estrategia por segmento y rampa de KPIs"),
   ("paid","ECG-008","0.20","Google Search y LinkedIn; Meta estacional"),
   ("trafficker","ECG-009","0.15","montaje, lead ads y conversiones"),
   ("leadgen","ECG-021","0.15","landings por línea, formularios, MQL y traspaso a SAP C4C"),
   ("analitica","ECG-031","0.10","GA4/GTM, conversiones offline y reporte mensual")]),
 "ese-creative": ("ksb-ese-creative","creative-managed-service",[
   ("contenido","ECG-010","0.15","línea editorial técnica y calendario"),
   ("social","ECG-006","0.25","LinkedIn, Instagram y Facebook 2 publicaciones/semana cada una"),
   ("diseno","ECG-003","0.25","piezas sociales y de pauta (~24/mes)"),
   ("copy","ECG-011","0.10","textos de publicaciones y anuncios"),
   ("video","ECG-018","0.12","1 video/mes para YouTube")]),
}
k = sys.argv[1]
acc, offer, lines = SETS[k]
json.dump(brief(acc, offer, lines), open(k+".brief.json","w"), ensure_ascii=False, indent=2)
