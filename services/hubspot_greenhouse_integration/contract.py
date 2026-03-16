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
            "company_owner": {
                "method": "GET",
                "path": "/companies/{hubspotCompanyId}/owner",
            },
            "company_contacts": {
                "method": "GET",
                "path": "/companies/{hubspotCompanyId}/contacts",
            },
            "company_services": {
                "method": "GET",
                "path": "/companies/{hubspotCompanyId}/services",
            },
            "service_profile": {
                "method": "GET",
                "path": "/services/{hubspotServiceId}",
            },
            "hubspot_webhook": {
                "method": "POST",
                "path": "/webhooks/hubspot",
            },
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
                "hs_pipeline",
                "hs_pipeline_stage",
                "hubspot_owner_id",
                "createdate",
                "hs_lastmodifieddate",
            ],
        },
        "decisionRules": {
            "reuseStandardCompanyFields": True,
            "createCustomCompanyPropertyOnlyIfMissingAtCompanyLevel": True,
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
