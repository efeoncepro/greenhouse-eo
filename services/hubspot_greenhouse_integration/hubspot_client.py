from typing import Any

import requests

try:
    from .config import HUBSPOT_API
except ImportError:
    # Allow standalone execution when Cloud Run deploys from this subdirectory.
    from config import HUBSPOT_API


class HubSpotIntegrationError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _parse_error(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text or response.reason

    message = payload.get("message") or payload.get("status") or response.reason
    errors = payload.get("errors") or []
    if not errors:
        return message

    details = []
    for err in errors:
        err_message = err.get("message")
        context = err.get("context")
        if context:
            err_message = f"{err_message} | context={context}"
        if err_message:
            details.append(err_message)
    return f"{message} | {'; '.join(details)}" if details else message


class HubSpotClient:
    def __init__(self, *, access_token: str, timeout_seconds: int):
        normalized_access_token = access_token.strip()
        if not normalized_access_token:
            raise HubSpotIntegrationError("HUBSPOT_ACCESS_TOKEN is not set")
        self.access_token = normalized_access_token
        self.timeout_seconds = timeout_seconds
        self.session = requests.Session()

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    def get_company(self, company_id: str, *, properties: list[str]) -> dict[str, Any]:
        response = self.session.get(
            f"{HUBSPOT_API}/crm/v3/objects/companies/{company_id}",
            headers=self._headers(),
            params={"properties": ",".join(properties)},
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    def get_owner(self, owner_id: str) -> dict[str, Any]:
        response = self.session.get(
            f"{HUBSPOT_API}/crm/v3/owners/{owner_id}",
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    def list_company_contact_ids(self, company_id: str, *, limit: int = 100) -> list[str]:
        contact_ids: list[str] = []
        after: str | None = None

        while True:
            params: dict[str, str | int] = {"limit": limit}
            if after:
                params["after"] = after

            response = self.session.get(
                f"{HUBSPOT_API}/crm/v4/objects/companies/{company_id}/associations/contacts",
                headers=self._headers(),
                params=params,
                timeout=self.timeout_seconds,
            )
            if response.status_code >= 400:
                raise HubSpotIntegrationError(
                    _parse_error(response),
                    status_code=response.status_code,
                )

            payload = response.json()
            for result in payload.get("results") or []:
                contact_id = result.get("toObjectId")
                if contact_id is not None:
                    contact_ids.append(str(contact_id))

            paging = payload.get("paging") or {}
            next_page = paging.get("next") or {}
            after = next_page.get("after")
            if not after:
                break

        deduped_contact_ids: list[str] = []
        seen = set()
        for contact_id in contact_ids:
            if contact_id in seen:
                continue
            seen.add(contact_id)
            deduped_contact_ids.append(contact_id)
        return deduped_contact_ids

    def get_contacts_by_ids(
        self,
        contact_ids: list[str],
        *,
        properties: list[str],
    ) -> list[dict[str, Any]]:
        if not contact_ids:
            return []

        results: list[dict[str, Any]] = []
        for start in range(0, len(contact_ids), 100):
            batch_ids = contact_ids[start : start + 100]
            response = self.session.post(
                f"{HUBSPOT_API}/crm/v3/objects/contacts/batch/read",
                headers=self._headers(),
                json={
                    "properties": properties,
                    "inputs": [{"id": contact_id} for contact_id in batch_ids],
                },
                timeout=self.timeout_seconds,
            )
            if response.status_code >= 400:
                raise HubSpotIntegrationError(
                    _parse_error(response),
                    status_code=response.status_code,
                )
            payload = response.json()
            results.extend(payload.get("results") or [])
        return results

    # ------------------------------------------------------------------
    # Services (custom object: p_services / objectTypeId 0-162)
    # ------------------------------------------------------------------

    def get_service(self, service_id: str, *, properties: list[str]) -> dict[str, Any]:
        response = self.session.get(
            f"{HUBSPOT_API}/crm/v3/objects/p_services/{service_id}",
            headers=self._headers(),
            params={"properties": ",".join(properties)},
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    def list_company_service_ids(self, company_id: str, *, limit: int = 100) -> list[str]:
        service_ids: list[str] = []
        after: str | None = None

        while True:
            params: dict[str, str | int] = {"limit": limit}
            if after:
                params["after"] = after

            response = self.session.get(
                f"{HUBSPOT_API}/crm/v4/objects/companies/{company_id}/associations/p_services",
                headers=self._headers(),
                params=params,
                timeout=self.timeout_seconds,
            )
            if response.status_code >= 400:
                raise HubSpotIntegrationError(
                    _parse_error(response),
                    status_code=response.status_code,
                )

            payload = response.json()
            for result in payload.get("results") or []:
                service_id = result.get("toObjectId")
                if service_id is not None:
                    service_ids.append(str(service_id))

            paging = payload.get("paging") or {}
            next_page = paging.get("next") or {}
            after = next_page.get("after")
            if not after:
                break

        deduped_service_ids: list[str] = []
        seen = set()
        for service_id in service_ids:
            if service_id in seen:
                continue
            seen.add(service_id)
            deduped_service_ids.append(service_id)
        return deduped_service_ids

    # ------------------------------------------------------------------
    # Products (catalog)
    # ------------------------------------------------------------------

    PRODUCT_PROPERTIES = [
        "hs_product_name", "hs_sku", "hs_product_description", "price",
        "cost_of_goods_sold", "hs_cost_price", "tax", "hs_recurring",
        "hs_recurring_billing_period", "hs_recurring_billing_frequency",
        "createdate", "hs_lastmodifieddate",
    ]

    def list_all_products(self, *, properties: list[str] | None = None) -> list[dict[str, Any]]:
        props = properties or self.PRODUCT_PROPERTIES
        results: list[dict[str, Any]] = []
        after: str | None = None

        while True:
            params: dict[str, str | int] = {"limit": 100, "properties": ",".join(props)}
            if after:
                params["after"] = after

            response = self.session.get(
                f"{HUBSPOT_API}/crm/v3/objects/products",
                headers=self._headers(),
                params=params,
                timeout=self.timeout_seconds,
            )
            if response.status_code >= 400:
                raise HubSpotIntegrationError(
                    _parse_error(response),
                    status_code=response.status_code,
                )

            payload = response.json()
            results.extend(payload.get("results") or [])

            paging = payload.get("paging") or {}
            next_page = paging.get("next") or {}
            after = next_page.get("after")
            if not after:
                break

        return results

    def get_product(self, product_id: str, *, properties: list[str] | None = None) -> dict[str, Any]:
        props = properties or self.PRODUCT_PROPERTIES
        response = self.session.get(
            f"{HUBSPOT_API}/crm/v3/objects/products/{product_id}",
            headers=self._headers(),
            params={"properties": ",".join(props)},
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    def create_product(self, properties: dict[str, Any]) -> dict[str, Any]:
        response = self.session.post(
            f"{HUBSPOT_API}/crm/v3/objects/products",
            headers=self._headers(),
            json={"properties": properties},
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    def update_product(self, product_id: str, properties: dict[str, Any]) -> dict[str, Any]:
        response = self.session.patch(
            f"{HUBSPOT_API}/crm/v3/objects/products/{product_id}",
            headers=self._headers(),
            json={"properties": properties},
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    # ------------------------------------------------------------------
    # Line Items (read for quotes/deals)
    # ------------------------------------------------------------------

    LINE_ITEM_PROPERTIES = [
        "hs_product_id", "name", "quantity", "price",
        "discount", "discount_percentage", "amount", "tax",
        "description", "hs_billing_frequency", "hs_billing_period",
        "hs_createdate",
    ]

    def list_quote_line_item_ids(self, quote_id: str, *, limit: int = 100) -> list[str]:
        li_ids: list[str] = []
        after: str | None = None

        while True:
            params: dict[str, str | int] = {"limit": limit}
            if after:
                params["after"] = after

            response = self.session.get(
                f"{HUBSPOT_API}/crm/v4/objects/quotes/{quote_id}/associations/line_items",
                headers=self._headers(),
                params=params,
                timeout=self.timeout_seconds,
            )
            if response.status_code >= 400:
                raise HubSpotIntegrationError(
                    _parse_error(response),
                    status_code=response.status_code,
                )

            payload = response.json()
            for result in payload.get("results") or []:
                li_id = result.get("toObjectId")
                if li_id is not None:
                    li_ids.append(str(li_id))

            paging = payload.get("paging") or {}
            next_page = paging.get("next") or {}
            after = next_page.get("after")
            if not after:
                break

        seen: set[str] = set()
        deduped: list[str] = []
        for lid in li_ids:
            if lid not in seen:
                seen.add(lid)
                deduped.append(lid)
        return deduped

    def get_line_items_by_ids(
        self,
        line_item_ids: list[str],
        *,
        properties: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        if not line_item_ids:
            return []

        props = properties or self.LINE_ITEM_PROPERTIES
        results: list[dict[str, Any]] = []
        for start in range(0, len(line_item_ids), 100):
            batch_ids = line_item_ids[start : start + 100]
            response = self.session.post(
                f"{HUBSPOT_API}/crm/v3/objects/line_items/batch/read",
                headers=self._headers(),
                json={
                    "properties": props,
                    "inputs": [{"id": lid} for lid in batch_ids],
                },
                timeout=self.timeout_seconds,
            )
            if response.status_code >= 400:
                raise HubSpotIntegrationError(
                    _parse_error(response),
                    status_code=response.status_code,
                )
            payload = response.json()
            results.extend(payload.get("results") or [])
        return results

    # ------------------------------------------------------------------
    # Quotes
    # ------------------------------------------------------------------

    QUOTE_PROPERTIES = [
        "hs_title", "hs_quote_number", "hs_quote_amount", "hs_currency",
        "hs_discount_percentage", "hs_status", "hs_expiration_date",
        "hs_quote_link", "hs_esign_enabled", "hs_payment_enabled",
        "hs_language", "hs_locale", "hs_sender_firstname", "hs_sender_lastname",
        "hs_sender_email", "hs_sender_company_name", "createdate", "hs_lastmodifieddate",
    ]

    def list_company_quote_ids(self, company_id: str, *, limit: int = 100) -> list[str]:
        quote_ids: list[str] = []
        after: str | None = None

        while True:
            params: dict[str, str | int] = {"limit": limit}
            if after:
                params["after"] = after

            response = self.session.get(
                f"{HUBSPOT_API}/crm/v4/objects/companies/{company_id}/associations/quotes",
                headers=self._headers(),
                params=params,
                timeout=self.timeout_seconds,
            )
            if response.status_code >= 400:
                raise HubSpotIntegrationError(
                    _parse_error(response),
                    status_code=response.status_code,
                )

            payload = response.json()
            for result in payload.get("results") or []:
                quote_id = result.get("toObjectId")
                if quote_id is not None:
                    quote_ids.append(str(quote_id))

            paging = payload.get("paging") or {}
            next_page = paging.get("next") or {}
            after = next_page.get("after")
            if not after:
                break

        seen: set[str] = set()
        deduped: list[str] = []
        for qid in quote_ids:
            if qid not in seen:
                seen.add(qid)
                deduped.append(qid)
        return deduped

    def get_quotes_by_ids(
        self,
        quote_ids: list[str],
        *,
        properties: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        if not quote_ids:
            return []

        props = properties or self.QUOTE_PROPERTIES
        results: list[dict[str, Any]] = []
        for start in range(0, len(quote_ids), 100):
            batch_ids = quote_ids[start : start + 100]
            response = self.session.post(
                f"{HUBSPOT_API}/crm/v3/objects/quotes/batch/read",
                headers=self._headers(),
                json={
                    "properties": props,
                    "inputs": [{"id": qid} for qid in batch_ids],
                },
                timeout=self.timeout_seconds,
            )
            if response.status_code >= 400:
                raise HubSpotIntegrationError(
                    _parse_error(response),
                    status_code=response.status_code,
                )
            payload = response.json()
            results.extend(payload.get("results") or [])
        return results

    def get_quote(self, quote_id: str, *, properties: list[str] | None = None) -> dict[str, Any]:
        props = properties or self.QUOTE_PROPERTIES
        response = self.session.get(
            f"{HUBSPOT_API}/crm/v3/objects/quotes/{quote_id}",
            headers=self._headers(),
            params={
                "properties": ",".join(props),
                "associations": "deals,companies,contacts,line_items",
            },
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    def create_quote(self, properties: dict[str, Any]) -> dict[str, Any]:
        response = self.session.post(
            f"{HUBSPOT_API}/crm/v3/objects/quotes",
            headers=self._headers(),
            json={"properties": properties},
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    def create_line_item(self, properties: dict[str, Any]) -> dict[str, Any]:
        response = self.session.post(
            f"{HUBSPOT_API}/crm/v3/objects/line_items",
            headers=self._headers(),
            json={"properties": properties},
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    def create_association(
        self, from_type: str, from_id: str, to_type: str, to_id: str, assoc_type: int
    ) -> None:
        response = self.session.put(
            f"{HUBSPOT_API}/crm/v4/objects/{from_type}/{from_id}/associations/{to_type}/{to_id}",
            headers=self._headers(),
            json=[{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": assoc_type}],
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )

    def update_quote(self, quote_id: str, properties: dict[str, Any]) -> dict[str, Any]:
        response = self.session.patch(
            f"{HUBSPOT_API}/crm/v3/objects/quotes/{quote_id}",
            headers=self._headers(),
            json={"properties": properties},
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    def get_services_by_ids(
        self,
        service_ids: list[str],
        *,
        properties: list[str],
    ) -> list[dict[str, Any]]:
        if not service_ids:
            return []

        results: list[dict[str, Any]] = []
        for start in range(0, len(service_ids), 100):
            batch_ids = service_ids[start : start + 100]
            response = self.session.post(
                f"{HUBSPOT_API}/crm/v3/objects/p_services/batch/read",
                headers=self._headers(),
                json={
                    "properties": properties,
                    "inputs": [{"id": service_id} for service_id in batch_ids],
                },
                timeout=self.timeout_seconds,
            )
            if response.status_code >= 400:
                raise HubSpotIntegrationError(
                    _parse_error(response),
                    status_code=response.status_code,
                )
            payload = response.json()
            results.extend(payload.get("results") or [])
        return results
