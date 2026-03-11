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
        },
        "decisionRules": {
            "reuseStandardCompanyFields": True,
            "createCustomCompanyPropertyOnlyIfMissingAtCompanyLevel": True,
        },
        "realtime": {
            "supported": False,
            "mode": "polling_or_on_demand",
            "details": (
                "This service can read current HubSpot state on demand, but it does "
                "not implement webhook-driven propagation yet."
            ),
        },
    }
