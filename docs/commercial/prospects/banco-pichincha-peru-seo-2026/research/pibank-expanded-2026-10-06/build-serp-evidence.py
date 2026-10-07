from pathlib import Path
import json,collections,urllib.parse
r=Path(__file__).resolve().parent;old=r.parent/'pibank-demand-2026-10-06'
paths=[old/'serp-provider.json',old/'serp-full-comparison.json',old/'serp-full-high-yield.json',old/'serp-full-online-opening.json']+sorted(r.glob('serp-*-provider.json'))
captures=[];errors=[]
for p in paths:
 a=json.loads(p.read_text());req=a.get('request',{}).get('tasks')or[]
 for t in a.get('response',{}).get('tasks')or[]:
  if t.get('status_code')!=20000:
   errors.append({'source':str(p.relative_to(r.parent)),'task_id':t.get('id'),'code':t.get('status_code'),'measured':False});continue
  for result in t.get('result')or[]:
   if result.get('type')!='organic' or 'items' not in result or not result.get('keyword'):continue
   task=t.get('data')or(next((x for x in req if x.get('keyword')==result.get('keyword')),{}))
   organic=[{k:x.get(k) for k in ['domain','url','title','description','rank_group','rank_absolute']} for x in result.get('items')or[] if x.get('type')=='organic']
   pibank=[x for x in organic if (x.get('domain')or'').replace('www.','')=='pibank.pe']
   paa=[]
   def walk(items):
    for x in items:
     if not isinstance(x,dict):continue
     if x.get('type') in ['people_also_ask_element','people_also_ask']:
      if x.get('title'):paa.append(x['title'])
      if x.get('question'):paa.append(x['question'])
     walk(x.get('items')or[])
   walk(result.get('items')or[])
   ai=[x for x in result.get('items')or[] if x.get('type')=='ai_overview']
   captures.append({'source':str(p.relative_to(r.parent)),'task_id':t.get('id'),'captured_at':a.get('queriedAt'),'query':result.get('keyword'),'location_code':result.get('location_code'),'language_code':result.get('language_code'),'device':task.get('device',result.get('device')),'depth_requested':task.get('depth'),'organic_rows_returned':len(organic),'organic':organic,'pibank_presence':'observed_in_captured_organic' if pibank else 'not_observed_in_captured_organic','pibank_rows':pibank,'paa_questions':list(dict.fromkeys(paa)),'ai_overview_returned':bool(ai),'ai_overview_status':'provider_organic_block_only_not_llm_baseline','ai_overview_async_requested':bool(task.get('load_async_ai_overview')),'ai_blocks':ai})
(r/'serp-evidence.json').write_text(json.dumps({'as_of':'2026-10-06','source_lens':'market_estimate_provider_live_capture','scope':'Selective PE/es queries/devices; source costs record paid vs reused; no census or GSC','captures':captures,'failed_tasks_excluded':errors,'llm_api_scraper_ai_mode_captures':False},ensure_ascii=False,indent=2))
p=r/'serp-competitors-01-provider.json'
if p.exists():
 a=json.loads(p.read_text());comp=[]
 for t in a['response']['tasks']:
  if t.get('status_code')!=20000:continue
  for result in t.get('result')or[]:
   for x in result.get('items')or[]:comp.append({k:x.get(k) for k in ['domain','avg_position','median_position','keywords_count','keywords_positions','relevant_serp_items']})
 (r/'serp-competitor-matrix.json').write_text(json.dumps({'scope':'Explicit9query panel including ownbrand; no marketSoV derived','queries':a['request']['tasks'][0]['keywords'],'source':'serp-competitors-01-provider.json','position_method':'Provider Labs snapshot rank positions; ETV/visibility discarded','domains':comp},ensure_ascii=False,indent=2))
print({'valid_captures':len(captures),'failed_tasks_preserved_not_measured':len(errors),'pibank_observed':[{'query':x['query'],'device':x['device'],'ranks':[y['rank_group'] for y in x['pibank_rows']]} for x in captures if x['pibank_rows']]})
