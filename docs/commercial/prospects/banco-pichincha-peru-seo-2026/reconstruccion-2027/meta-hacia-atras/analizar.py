from pathlib import Path
from math import ceil,isclose
from datetime import datetime,timezone
import json,hashlib
HERE=Path(__file__).resolve().parent
BASE=HERE.parent
cfg=json.loads((BASE/'economia/inputs.json').read_text())
goal=cfg['goal_usd'];ticket=cfg['ticket_usd_equivalent'];opening=cfg['opening_rate_test'];funding=cfg['funding_rate_test']
assert isclose(goal/ticket,cfg['goal_accounts'])
months=12 # ventana de planificación para comparar escalas; no periodo confirmado de la meta bancaria
panel_month=3690;eligibility=cfg['eligibility_test'];eligible_panel=panel_month*months*eligibility
rows=[]
for share in [1,.1,.05,.01]:
 amount=goal*share;funded=amount/ticket;opened=funded/funding;visits=opened/opening
 # Valores sin redondear en la cadena; ceil sólo en presentación. No realimentar redondeos.
 rows.append({'share':share,'initial_deposits_required_usd_equivalent':amount,'funded_accounts_required':funded,'openings_required':opened,'eligible_visits_required':visits,'annual_average_monthly_visits':visits/months,'requirement_over_partial_eligible_panel':visits/eligible_panel,'display':{'funded':ceil(funded),'opened':ceil(opened),'visits':ceil(visits)}})
sensitivity=[{'opening_rate_test':rate,'funding_rate_test':funding,'visits_for_all_goal':goal/ticket/funding/rate,'visits_for_5pct_goal':goal*.05/ticket/funding/rate} for rate in [.01,.02,.04]]
stock=[]
for external,retained in [(1,1),(1,.8),(.7,.8)]:
 funded=goal/(ticket*external*retained)
 stock.append({'external_share_test':external,'retained_balance_factor_at_cutoff_test':retained,'funded_required':funded,'openings_required':funded/funding,'visits_required':funded/funding/opening})
opened_goal=cfg['goal_accounts'];funded_if_open=opened_goal*funding;initial_if_open=funded_if_open*ticket
assert isclose(rows[0]['eligible_visits_required'],1169230.7692307692)
assert isclose(rows[2]['eligible_visits_required'],58461.53846153846)
assert isclose(rows[2]['funded_accounts_required'],760)
assert isclose(initial_if_open,24700000)
assert isclose(stock[-1]['visits_required'],2087912.087912088)
assert isclose(sensitivity[2]['visits_for_5pct_goal'],rows[2]['eligible_visits_required']/2)
result={'as_of':datetime.now(timezone.utc).isoformat(),'nature':'Requisitos desde la meta; no forecast ni metas de canal acordadas','planning_window_months':months,'bank_goal_period_confirmed':False,'goal_usd_equivalent_provisional':goal,'ticket_usd_equivalent_provisional':ticket,'conversion_tests':{'visit_to_open':opening,'open_to_funded':funding},'funded_goal_rows':rows,'opening_goal_alternative':{'openings':opened_goal,'funded_conditional':funded_if_open,'initial_deposit_conditional':initial_if_open,'visits_required':opened_goal/opening},'visit_sensitivity':sensitivity,'cutoff_stock_sensitivity':stock,'reverse_search_5pct_acquisition_only':{'capture_visits_per_eligible_search_test':.1,'eligibility_test':eligibility,'proxy_searches_monthly_required':rows[2]['eligible_visits_required']/(.1*eligibility*months),'interpretation':'Sólo si toda la contribución procediera de adquisición orgánica nueva; tasa efectiva de captura de prueba, no CTR medido ni TAM'},'partial_panel':{'proxy_searches_monthly':panel_month,'planning_months':months,'annual_proxy_searches':panel_month*months,'eligibility_test':eligibility,'eligible_proxy_searches':eligible_panel,'meaning':'canasta parcial con solapamiento residual; no TAM, visitas, personas ni forecast SEO'},'traffic_conversion_example':{'reference_visits_test':10000,'old_opening_rate_test':.02,'new_opening_rate_test':.03,'additional_openings_conditional':100,'funding_rate_fixed_test':.65,'additional_funded_conditional':65,'additional_initial_deposit_conditional':162500},'activation_example':{'reference_openings_test':10000,'old_funding_rate_test':.65,'new_funding_rate_test':.75,'additional_funded_conditional':1000,'additional_initial_deposit_conditional':2500000},'validation':'7 independent arithmetic identities PASS; no rounding propagated','source_inputs_sha256':hashlib.sha256((BASE/'economia/inputs.json').read_bytes()).hexdigest(),'client_outputs_modified':False}
(HERE/'resultados.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'full_funnel':rows[0],'5pct_funnel':rows[2],'sensitivity':sensitivity,'stock':stock,'alternative_opening_target':result['opening_goal_alternative'],'validation':result['validation']},ensure_ascii=False,indent=2))
