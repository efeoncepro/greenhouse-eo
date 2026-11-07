import { runGreenhousePostgresQuery as query } from '@/lib/postgres/client'

export type BridgeVariant = 'A-prime' | 'B'

export const seedFinanceRouting = async (variant: BridgeVariant) => {
  const seoClient = variant === 'A-prime' ? 'client-seo' : 'client-owner'

  await query(`TRUNCATE greenhouse_core.organizations, greenhouse_core.clients, greenhouse_core.spaces,
    greenhouse_core.services, greenhouse_finance.income, greenhouse_finance.expenses,
    greenhouse_finance.cost_allocations, greenhouse_finance.client_economics,
    greenhouse_serving.commercial_cost_attribution, greenhouse_serving.service_attribution_facts,
    greenhouse_serving.service_attribution_unresolved, greenhouse_commercial.quotations,
    greenhouse_commercial.contract_quotes, greenhouse_finance.purchase_orders,
    greenhouse_finance.service_entry_sheets, greenhouse_delivery.projects CASCADE;
    UPDATE sky_experiment.failure_switch SET enabled=false;
    INSERT INTO greenhouse_core.organizations(organization_id,organization_name)
      VALUES ('org-sky','Synthetic SKY'),('org-control','Synthetic control');
    INSERT INTO greenhouse_core.clients(client_id,client_name)
      VALUES ('client-owner','SKY commercial'),('client-seo','SEO candidate'),('client-control','Control');`)
  await query(`INSERT INTO greenhouse_core.spaces(space_id,client_id,organization_id)
    VALUES ('space-design','client-owner','org-sky'),('space-seo',$1,'org-sky'),
      ('space-control','client-control','org-control')`, [seoClient])
  await query(`INSERT INTO greenhouse_finance.client_profiles(client_profile_id,client_id,organization_id)
      VALUES ('profile-owner','client-owner','org-sky');
    INSERT INTO greenhouse_core.services(service_id,space_id,organization_id,name,hubspot_deal_id,
      active,status,hubspot_sync_status,start_date,linea_de_servicio)
      VALUES ('service-design','space-design','org-sky','Design','deal-design',true,'active','synced','2025-01-01','creative'),
        ('service-seo','space-seo','org-sky','SEO','deal-seo',true,'active','synced','2026-11-01','wave'),
        ('service-control','space-control','org-control','Control','deal-control',true,'active','synced','2025-01-01','creative');
    INSERT INTO greenhouse_finance.income(income_id,client_id,organization_id,hubspot_deal_id,total_amount,total_amount_clp,invoice_date)
      VALUES ('income-design','client-owner','org-sky','deal-design',1000,1000,'2026-11-10'),
        ('income-seo','client-owner','org-sky','deal-seo',500,500,'2026-11-10'),
        ('income-control','client-control','org-control','deal-control',100,100,'2026-11-10'),
        ('history-design','client-owner','org-sky','deal-design',900,900,'2026-10-10'),
        ('history-control','client-control','org-control','deal-control',100,100,'2026-10-10');
    INSERT INTO greenhouse_finance.expenses(expense_id,allocated_client_id,space_id,total_amount,total_amount_clp,
      document_date,period_year,period_month)
      VALUES ('expense-seo','client-owner','space-seo',120,120,'2026-11-10',2026,11),
        ('expense-design','client-owner','space-design',80,80,'2026-11-10',2026,11),
        ('expense-control','client-control','space-control',20,20,'2026-11-10',2026,11);
    INSERT INTO greenhouse_serving.commercial_cost_attribution(member_id,client_id,organization_id,client_name,
      period_year,period_month,commercial_labor_cost_target,commercial_loaded_cost_target)
      VALUES ('member-sky','client-owner','org-sky','SKY commercial',2026,11,100,100),
        ('member-sky','client-owner','org-sky','SKY commercial',2026,10,90,90);`)

  return seoClient
}

// JSONB snapshots compare every persisted field, including identifiers and timestamps.
export const persistedAttribution = async (month: number) => query(`
  SELECT 'fact' AS kind, to_jsonb(f) AS row FROM greenhouse_serving.service_attribution_facts f
    WHERE period_year=2026 AND period_month=$1
  UNION ALL
  SELECT 'unresolved', to_jsonb(u) FROM greenhouse_serving.service_attribution_unresolved u
    WHERE period_year=2026 AND period_month=$1 ORDER BY kind,row`, [month])

export const semanticAttribution = async (month: number) => query(`
  SELECT 'fact' AS kind, to_jsonb(f)-'attribution_id'-'materialized_at' AS row
    FROM greenhouse_serving.service_attribution_facts f WHERE period_year=2026 AND period_month=$1
  UNION ALL
  SELECT 'unresolved', to_jsonb(u)-'unresolved_id'-'materialized_at'
    FROM greenhouse_serving.service_attribution_unresolved u WHERE period_year=2026 AND period_month=$1
  ORDER BY kind,row`, [month])
