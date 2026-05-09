from __future__ import annotations

from typing import Any


def build_contract(config: dict[str, Any]) -> dict[str, Any]:
    return {
        "service": config["service_name"],
        "version": config["service_version"],
        "selectors": {
            "canonicalSource": {
                "sourceSystem": "hubspot_crm",
                "sourceObjectType": "company",
            },
            "primaryLookup": "hubspotCompanyId",
        },
        "actions": {
            "health": {"method": "GET", "path": "/health"},
            "contract": {"method": "GET", "path": "/contract"},
            "company_profile": {
                "method": "GET",
                "path": "/companies/{hubspotCompanyId}",
            },
            "company_search": {
                "method": "GET",
                "path": "/companies/search?q={query}&limit={limit}",
            },
            "company_owner": {
                "method": "GET",
                "path": "/companies/{hubspotCompanyId}/owner",
            },
            "owner_resolution": {
                "method": "GET",
                "path": "/owners/resolve?email={email}",
            },
            "company_contacts": {
                "method": "GET",
                "path": "/companies/{hubspotCompanyId}/contacts",
            },
            "company_deals": {
                "method": "GET",
                "path": "/companies/{hubspotCompanyId}/deals",
            },
            "company_services": {
                "method": "GET",
                "path": "/companies/{hubspotCompanyId}/services",
            },
            "company_lifecycle_update": {
                "method": "PATCH",
                "path": "/companies/{hubspotCompanyId}/lifecycle",
            },
            "deal_create": {
                "method": "POST",
                "path": "/deals",
            },
            "deal_metadata": {
                "method": "GET",
                "path": "/deals/metadata",
            },
            "service_profile": {
                "method": "GET",
                "path": "/services/{hubspotServiceId}",
            },
            "product_catalog": {
                "method": "GET",
                "path": "/products",
            },
            "product_detail": {
                "method": "GET",
                "path": "/products/{hubspotProductId}",
            },
            "product_create": {
                "method": "POST",
                "path": "/products",
            },
            "product_update": {
                "method": "PATCH",
                "path": "/products/{hubspotProductId}",
            },
            "product_archive": {
                "method": "POST",
                "path": "/products/{hubspotProductId}/archive",
            },
            "product_reconcile": {
                "method": "GET",
                "path": "/products/reconcile",
            },
            "hubspot_webhook": {
                "method": "POST",
                "path": "/webhooks/hubspot",
            },
        },
        "writeAuth": {
            "type": "integration_token",
            "headers": [
                "Authorization: Bearer <GREENHOUSE_INTEGRATION_API_TOKEN>",
                "x-greenhouse-integration-key: <GREENHOUSE_INTEGRATION_API_TOKEN>",
            ],
            "appliesTo": [
                "company_lifecycle_update",
                "deal_create",
                "product_create",
                "product_update",
                "product_archive",
            ],
        },
        "companyModel": {
            "identity": [
                "hubspotCompanyId",
                "name",
                "domain",
                "website",
                "industry",
                "country",
                "city",
                "state",
            ],
            "lifecycle": [
                "lifecyclestage",
                "hs_current_customer",
                "hubspot_team_id",
                "gh_commercial_party_id",
                "gh_last_quote_at",
                "gh_last_contract_at",
                "gh_active_contracts_count",
                "gh_last_write_at",
                "gh_mrr_tier",
            ],
            "capabilities": [
                "businessLines",
                "serviceModules",
            ],
            "owner": [
                "hubspotOwnerId",
                "ownerEmail",
                "ownerFirstName",
                "ownerLastName",
                "ownerDisplayName",
            ],
            "contacts": [
                "hubspotContactId",
                "email",
                "firstName",
                "lastName",
                "displayName",
                "phone",
                "mobilePhone",
                "jobTitle",
                "lifecyclestage",
                "hsLeadStatus",
            ],
        },
        "ownerResolutionModel": {
            "required": [
                "email",
            ],
            "response": [
                "email",
                "owner",
            ],
        },
        "dealCreateModel": {
            "required": [
                "idempotencyKey",
                "hubspotCompanyId",
                "dealName",
                "origin",
            ],
            "optional": [
                "amount",
                "currency",
                "pipelineId",
                "stageId",
                "dealType",
                "priority",
                "ownerHubspotUserId",
                "closeDate",
                "businessLineCode",
                "correlationId",
                "hubspotContactId",
            ],
            "customProperties": [
                "gh_deal_origin",
                "gh_idempotency_key",
            ],
            "supportedOrigins": [
                "greenhouse_quote_builder",
            ],
            "response": [
                "status",
                "hubspotDealId",
                "pipelineUsed",
                "stageUsed",
                "dealTypeUsed",
                "priorityUsed",
                "ownerUsed",
                "message",
            ],
            "errorCodes": [
                "HUBSPOT_AUTH",
                "HUBSPOT_RATE_LIMIT",
                "HUBSPOT_VALIDATION",
                "HUBSPOT_UPSTREAM",
            ],
        },
        "companyDealsModel": {
            "required": [
                "hubspotCompanyId",
            ],
            "response": [
                "hubspotCompanyId",
                "count",
                "deals",
            ],
        },
        "productModel": {
            "identity": [
                "productId",
                "hubspotProductId",
                "name",
                "sku",
            ],
            "pricing": [
                "unitPrice",
                "costOfGoodsSold",
                "tax",
            ],
            "billing": [
                "isRecurring",
                "frequency",
                "periodCount",
            ],
            "customProperties": [
                "gh_product_code",
                "gh_source_kind",
                "gh_last_write_at",
                "gh_archived_by_greenhouse",
                "gh_business_line",
            ],
        },
        "sourceFields": {
            "companies": [
                "name",
                "domain",
                "website",
                "industry",
                "country",
                "city",
                "state",
                "lifecyclestage",
                "hs_current_customer",
                "hubspot_owner_id",
                "hubspot_team_id",
                "gh_commercial_party_id",
                "gh_last_quote_at",
                "gh_last_contract_at",
                "gh_active_contracts_count",
                "gh_last_write_at",
                "gh_mrr_tier",
                config["business_line_prop"],
                config["service_module_prop"],
            ],
            "owners": [
                "id",
                "email",
                "firstName",
                "lastName",
                "userId",
                "archived",
            ],
            "contacts": [
                "email",
                "firstname",
                "lastname",
                "phone",
                "mobilephone",
                "jobtitle",
                "lifecyclestage",
                "hs_lead_status",
                "company",
            ],
            "products": [
                "name",
                "hs_sku",
                "description",
                "price",
                "cost_of_goods_sold",
                "hs_cost_price",
                "tax",
                "hs_recurring",
                "hs_recurring_billing_period",
                "hs_recurring_billing_frequency",
                "createdate",
                "hs_lastmodifieddate",
                "gh_product_code",
                "gh_source_kind",
                "gh_last_write_at",
                "gh_archived_by_greenhouse",
                "gh_business_line",
                # TASK-604 — v2 inbound rehydration. These properties are
                # always requested from HubSpot; the middleware branches on
                # `X-Contract-Version: v2` to decide whether to expose them
                # in the response payload. They return NULL when unset.
                "hs_price_clp",
                "hs_price_usd",
                "hs_price_clf",
                "hs_price_cop",
                "hs_price_mxn",
                "hs_price_pen",
                "hs_rich_text_description",
                "hs_product_type",
                "hs_pricing_model",
                "hs_product_classification",
                "hs_bundle_type",
                "categoria_de_item",
                "unidad",
                "hs_tax_category",
                "hs_url",
                "hs_images",
                "hubspot_owner_id",
                "hubspot_owner_assigneddate",
            ],
            "deals": [
                "dealname",
                "amount",
                "deal_currency_code",
                "dealstage",
                "pipeline",
                "dealtype",
                "hs_priority",
                "hubspot_owner_id",
                "closedate",
                "createdate",
                "hs_lastmodifieddate",
                "gh_deal_origin",
                "gh_idempotency_key",
            ],
            "services": [
                "ef_space_id",
                "ef_organization_id",
                "ef_pipeline_stage",
                "ef_linea_de_servicio",
                "ef_servicio_especifico",
                "ef_start_date",
                "ef_target_end_date",
                "ef_total_cost",
                "ef_amount_paid",
                "ef_currency",
                "ef_modalidad",
                "ef_billing_frequency",
                "ef_country",
                "ef_notion_project_id",
                "ef_greenhouse_service_id",
                "ef_deal_id",
                "ef_engagement_kind",
                "hs_pipeline",
                "hs_pipeline_stage",
                "hs_name",
                "hubspot_owner_id",
                "createdate",
                "hs_lastmodifieddate",
            ],
        },
        "decisionRules": {
            "reuseStandardCompanyFields": True,
            "createCustomCompanyPropertyOnlyIfMissingAtCompanyLevel": True,
            "restrictProductCustomPropertiesToGhPrefix": True,
            "dealIdempotencyUsesGhPropertyWhenPresent": True,
        },
        "dealMetadataModel": {
            "pipelines": [
                "pipelineId",
                "label",
                "displayOrder",
                "archived",
                "stages",
            ],
            "stage": [
                "stageId",
                "label",
                "displayOrder",
                "archived",
                "metadata",
            ],
            "properties": [
                "propertyName",
                "label",
                "type",
                "fieldType",
                "hubspotDefined",
                "options",
            ],
            "supportedPropertyLookups": [
                "dealtype",
                "hs_priority",
            ],
        },
        "realtime": {
            "supported": bool(
                config.get("hubspot_app_client_secret")
                and config.get("greenhouse_base_url")
                and config.get("greenhouse_integration_api_token")
            ),
            "mode": (
                "hubspot_webhooks"
                if config.get("hubspot_app_client_secret")
                and config.get("greenhouse_base_url")
                and config.get("greenhouse_integration_api_token")
                else "polling_or_on_demand"
            ),
            "details": (
                "This service can read current HubSpot state on demand and can relay "
                "company capability changes through HubSpot webhooks when the webhook "
                "client secret plus Greenhouse integration auth are configured."
            ),
        },
    }
