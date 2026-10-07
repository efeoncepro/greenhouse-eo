"""Consolida evidencia guardada; no llama APIs ni convierte búsquedas en visitantes."""
from pathlib import Path
import collections,csv,hashlib,json,unicodedata
ROOT=Path(__file__).resolve().parent
CASE=ROOT.parent.parent
OLD=ROOT.parent/'pibank-competitor-capture-2026-10-06'
def norm(s):return ' '.join(''.join(c for c in unicodedata.normalize('NFD',s.lower())if not unicodedata.combining(c)).split())
def writecsv(name,rows):
    with (ROOT/name).open('w')as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
rows=list(csv.DictReader((OLD/'capturas-competidores.csv').open()))
for r in rows:
    for k in ('monthly_searches_estimated','rank_group'):r[k]=int(r[k])if r[k]else None
receipts=[]
for name,bank in [('interbank','Interbank'),('scotiabank','Scotiabank'),('bbva-product','BBVA')]:
    p=ROOT/(name+'-provider.json');j=json.loads(p.read_text())
    for t in j['response']['tasks']:
        assert t['status_code']==20000
        for result in t['result']:
            assert result['items_count']==result['total_count'],'Filtered coverage incomplete'
            receipts.append(dict(bank=bank,task_id=t['id'],cost_usd=t['cost'],returned_rows=result['items_count'],total_filtered_rows=result['total_count'],queried_at=j['queriedAt'],source=str(p.relative_to(CASE)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
            for i in result['items']:
                kd=i['keyword_data'];ki=kd.get('keyword_info')or{};el=i['ranked_serp_element'];si=el['serp_item']
                rows.append(dict(bank=bank,keyword=kd['keyword'],normalized_keyword=norm(kd['keyword']),monthly_searches_estimated=ki.get('search_volume'),rank_group=si.get('rank_group'),url=si['url'],keyword_updated_at=ki.get('last_updated_time'),ranking_updated_at=el.get('last_updated_time'),queried_at=j['queriedAt'],task_id=t['id'],source=str(p.relative_to(CASE)),family_id='',verdict='not_selected_for_capture_plan'))
unique={}
for r in sorted(rows,key=lambda r:r['queried_at']):unique[(r['bank'],r['normalized_keyword'],r['url'])]=r
final=list(unique.values())
families=list(csv.DictReader((OLD/'plan-busquedas.csv').open()))
assigned={}
for f in families:
    for term in [f['representative']]+f['aliases_not_added'].split('; '):
        if term:assigned[norm(term)]=f['family_id']
    ranks={}
    for r in final:
        if r['normalized_keyword']==norm(f['representative'])and isinstance(r['rank_group'],int):ranks[r['bank']]=min(ranks.get(r['bank'],1000),r['rank_group'])
    f['ranking_evidence']='; '.join(f'{b}: {v}'for b,v in sorted(ranks.items()))or'not_captured_for_exact_query'
for r in final:
    r['family_id']=assigned.get(r['normalized_keyword'],'');r['verdict']='selected_exploratory_family'if r['family_id']else'not_selected_for_capture_plan'
writecsv('capturas-competidores.csv',final);writecsv('plan-busquedas.csv',families)
lanes={lane:sum(int(f['estimated_monthly_query_volume'])for f in families if f['lane']==lane)for lane in('direct','conditional','competitor','assisted')}
assert lanes=={'direct':3740,'conditional':3330,'competitor':18300,'assisted':5680}
old=json.loads((ROOT.parent/'pibank-expanded-2026-10-06/coverage-and-costs.json').read_text())
total=round(1.27782+sum(r['cost_usd']for r in receipts),8)
result=dict(as_of='2026-10-06 America/Santiago; queries UTC 2026-10-07',raw_observations=len(rows),deduplicated_bank_keyword_url_observations=len(final),exact_queries=len({r['normalized_keyword']for r in final}),observations_by_bank=dict(collections.Counter(r['bank']for r in final)),new_domain_receipts=receipts,new_paid_cost_usd=round(sum(r['cost_usd']for r in receipts),8),total_confirmed_research_cost_usd=total,budget_ceiling_usd=2,remaining_unknown_costs=[],proxy_by_lane=lanes,families=19,scope='Complete within returned product/keyword filters for Interbank, Scotiabank and BBVA; BCP prior capture. Not all-bank census, live SERP or TAM.',historical_bbva_result='Portal confirms prior USD0.132 task complete;1000 rows unavailable and excluded from observations; not retried. New BBVA query has narrower keyword filter.',volumes='Family representatives preserve original source/date; no summing variants or competitor brand into direct acquisition.')
if (ROOT/'baseline-backlinks.json').exists():
    baseline=json.loads((ROOT/'baseline-backlinks.json').read_text())
    result.update(new_backlink_cost_usd=baseline['cost_usd'],new_paid_calls=5,backlinks_baseline_file='baseline-backlinks.json')
    result['new_paid_cost_usd']=round(result['new_paid_cost_usd']+baseline['cost_usd'],8)
    result['total_confirmed_research_cost_usd']=round(result['total_confirmed_research_cost_usd']+baseline['cost_usd'],8)
result['previous_reused_research_cost_usd_separate']=.07714
result['conservative_cost_including_previous_reused_usd']=round(result['total_confirmed_research_cost_usd']+.07714,8)
assert result['conservative_cost_including_previous_reused_usd']<2
(ROOT/'resultados.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k]for k in ('raw_observations','deduplicated_bank_keyword_url_observations','exact_queries','observations_by_bank','new_paid_cost_usd','total_confirmed_research_cost_usd')}))
