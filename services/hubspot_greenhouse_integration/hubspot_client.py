from __future__ import annotations

from typing import Any

import requests

try:
    from .config import HUBSPOT_API
except ImportError:
    # Allow standalone execution when Cloud Run deploys from this subdirectory.
    from config import HUBSPOT_API


class HubSpotIntegrationError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        error_code: str | None = None,
        retry_after: str | int | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.retry_after = retry_after


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


def _classify_error_code(status_code: int) -> str:
    if status_code in {401, 403}:
        return "HUBSPOT_AUTH"
    if status_code == 429:
        return "HUBSPOT_RATE_LIMIT"
    if 400 <= status_code < 500:
        return "HUBSPOT_VALIDATION"
    return "HUBSPOT_UPSTREAM"


def _raise_hubspot_error(response: requests.Response) -> None:
    raise HubSpotIntegrationError(
        _parse_error(response),
        status_code=response.status_code,
        error_code=_classify_error_code(response.status_code),
        retry_after=response.headers.get("Retry-After"),
    )


class HubSpotClient:
    DEAL_PROPERTIES = [
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
    ]

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

    @staticmethod
    def _association_object_name(object_type: str) -> str:
        return {
            "companies": "company",
            "company": "company",
            "contacts": "contact",
            "contact": "contact",
            "deals": "deal",
            "deal": "deal",
        }.get(object_type, object_type)

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

    def search_companies(
        self,
        query: str,
        *,
        properties: list[str],
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        normalized_query = query.strip()
        if not normalized_query:
            return []

        response = self.session.post(
            f"{HUBSPOT_API}/crm/v3/objects/companies/search",
            headers=self._headers(),
            json={
                "query": normalized_query,
                "properties": self._unique_properties(properties),
                "limit": max(1, min(limit, 50)),
                "sorts": ["-hs_lastmodifieddate"],
            },
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return (response.json() or {}).get("results") or []

    def update_company(self, company_id: str, properties: dict[str, Any]) -> dict[str, Any]:
        response = self.session.patch(
            f"{HUBSPOT_API}/crm/v3/objects/companies/{company_id}",
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

    def search_deals(
        self,
        *,
        property_name: str,
        property_value: str,
        properties: list[str] | None = None,
        limit: int = 1,
    ) -> list[dict[str, Any]]:
        normalized_name = property_name.strip()
        normalized_value = property_value.strip()
        if not normalized_name or not normalized_value:
            return []

        response = self.session.post(
            f"{HUBSPOT_API}/crm/v3/objects/deals/search",
            headers=self._headers(),
            json={
                "filterGroups": [
                    {
                        "filters": [
                            {
                                "propertyName": normalized_name,
                                "operator": "EQ",
                                "value": normalized_value,
                            }
                        ]
                    }
                ],
                "properties": self._unique_properties(properties or self.DEAL_PROPERTIES),
                "limit": max(1, min(limit, 10)),
            },
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            _raise_hubspot_error(response)
        return (response.json() or {}).get("results") or []

    def create_deal(self, properties: dict[str, Any]) -> dict[str, Any]:
        response = self.session.post(
            f"{HUBSPOT_API}/crm/v3/objects/deals",
            headers=self._headers(),
            json={"properties": properties},
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            _raise_hubspot_error(response)
        return response.json()

    def list_deal_pipelines(self) -> list[dict[str, Any]]:
        response = self.session.get(
            f"{HUBSPOT_API}/crm/v3/pipelines/deals",
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            _raise_hubspot_error(response)
        return (response.json() or {}).get("results") or []

    def get_deal_property(self, property_name: str) -> dict[str, Any]:
        normalized_name = property_name.strip()
        if not normalized_name:
            raise ValueError("property_name is required")

        response = self.session.get(
            f"{HUBSPOT_API}/crm/v3/properties/deals/{normalized_name}",
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            _raise_hubspot_error(response)
        return response.json()

    def get_deal(
        self,
        deal_id: str,
        *,
        properties: list[str] | None = None,
        associations: list[str] | None = None,
    ) -> dict[str, Any]:
        params: dict[str, str] = {
            "properties": ",".join(properties or self.DEAL_PROPERTIES)
        }
        if associations:
            params["associations"] = ",".join(associations)

        response = self.session.get(
            f"{HUBSPOT_API}/crm/v3/objects/deals/{deal_id}",
            headers=self._headers(),
            params=params,
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            _raise_hubspot_error(response)
        return response.json()

    def find_deal_by_idempotency_key(
        self,
        idempotency_key: str,
        *,
        properties: list[str] | None = None,
    ) -> tuple[dict[str, Any] | None, bool]:
        normalized_key = idempotency_key.strip()
        if not normalized_key:
            return None, False

        try:
            matches = self.search_deals(
                property_name="gh_idempotency_key",
                property_value=normalized_key,
                properties=properties or self.DEAL_PROPERTIES,
                limit=1,
            )
        except HubSpotIntegrationError as exc:
            if exc.status_code == 400 and "gh_idempotency_key" in str(exc).lower():
                return None, False
            raise

        return (matches[0] if matches else None), True

    def create_default_association(
        self,
        from_type: str,
        from_id: str,
        to_type: str,
        to_id: str,
    ) -> dict[str, Any]:
        response = self.session.put(
            (
                f"{HUBSPOT_API}/crm/v4/objects/"
                f"{self._association_object_name(from_type)}/{from_id}"
                f"/associations/default/{self._association_object_name(to_type)}/{to_id}"
            ),
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            _raise_hubspot_error(response)
        return response.json() if response.content else {}

    def archive_deal(self, deal_id: str) -> None:
        response = self.session.delete(
            f"{HUBSPOT_API}/crm/v3/objects/deals/{deal_id}",
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            _raise_hubspot_error(response)

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

    def list_owners(
        self,
        *,
        email: str | None = None,
        archived: bool = False,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {
            "archived": str(bool(archived)).lower(),
            "limit": max(1, min(int(limit), 100)),
        }
        normalized_email = (email or "").strip()
        if normalized_email:
            params["email"] = normalized_email

        response = self.session.get(
            f"{HUBSPOT_API}/crm/v3/owners",
            headers=self._headers(),
            params=params,
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return (response.json() or {}).get("results") or []

    def resolve_owner_by_email(self, email: str) -> dict[str, Any] | None:
        normalized_email = (email or "").strip()
        if not normalized_email:
            return None

        normalized_email_key = normalized_email.casefold()

        for archived in (False, True):
            owners = self.list_owners(email=normalized_email, archived=archived)
            for owner in owners:
                owner_email = str(owner.get("email") or "").strip()
                if owner_email and owner_email.casefold() == normalized_email_key:
                    return owner

        return None

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

    def list_company_deal_ids(self, company_id: str, *, limit: int = 100) -> list[str]:
        deal_ids: list[str] = []
        after: str | None = None

        while True:
            params: dict[str, str | int] = {"limit": limit}
            if after:
                params["after"] = after

            response = self.session.get(
                f"{HUBSPOT_API}/crm/v4/objects/companies/{company_id}/associations/deals",
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
                deal_id = result.get("toObjectId")
                if deal_id is not None:
                    deal_ids.append(str(deal_id))

            paging = payload.get("paging") or {}
            next_page = paging.get("next") or {}
            after = next_page.get("after")
            if not after:
                break

        deduped_deal_ids: list[str] = []
        seen = set()
        for deal_id in deal_ids:
            if deal_id in seen:
                continue
            seen.add(deal_id)
            deduped_deal_ids.append(deal_id)
        return deduped_deal_ids

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

    def get_deals_by_ids(
        self,
        deal_ids: list[str],
        *,
        properties: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        if not deal_ids:
            return []

        props = self._unique_properties(properties or self.DEAL_PROPERTIES)
        results: list[dict[str, Any]] = []
        for start in range(0, len(deal_ids), 100):
            batch_ids = deal_ids[start : start + 100]
            response = self.session.post(
                f"{HUBSPOT_API}/crm/v3/objects/deals/batch/read",
                headers=self._headers(),
                json={
                    "properties": props,
                    "inputs": [{"id": deal_id} for deal_id in batch_ids],
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
        "name", "hs_sku", "description", "price",
        "cost_of_goods_sold", "hs_cost_price", "tax", "hs_recurring",
        "hs_recurring_billing_period", "hs_recurring_billing_frequency",
        "createdate", "hs_lastmodifieddate",
    ]
    PRODUCT_CUSTOM_PROPERTIES = [
        "gh_product_code",
        "gh_source_kind",
        "gh_last_write_at",
        "gh_archived_by_greenhouse",
        "gh_business_line",
    ]
    RECONCILE_PRODUCT_PROPERTIES = PRODUCT_PROPERTIES + PRODUCT_CUSTOM_PROPERTIES

    @staticmethod
    def _unique_properties(properties: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for prop in properties:
            if prop in seen:
                continue
            seen.add(prop)
            deduped.append(prop)
        return deduped

    def list_products_page(
        self,
        *,
        limit: int = 100,
        after: str | None = None,
        archived: bool = False,
        properties: list[str] | None = None,
    ) -> dict[str, Any]:
        props = self._unique_properties(properties or self.PRODUCT_PROPERTIES)
        params: dict[str, str | int | bool] = {
            "limit": limit,
            "properties": ",".join(props),
            "archived": str(bool(archived)).lower(),
        }
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

        return response.json()

    def list_all_products(self, *, properties: list[str] | None = None) -> list[dict[str, Any]]:
        props = self._unique_properties(properties or self.PRODUCT_PROPERTIES)
        results: list[dict[str, Any]] = []
        after: str | None = None

        while True:
            payload = self.list_products_page(
                limit=100,
                after=after,
                properties=props,
            )
            results.extend(payload.get("results") or [])

            paging = payload.get("paging") or {}
            next_page = paging.get("next") or {}
            after = next_page.get("after")
            if not after:
                break

        return results

    def get_product(self, product_id: str, *, properties: list[str] | None = None) -> dict[str, Any]:
        props = self._unique_properties(properties or self.PRODUCT_PROPERTIES)
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

    def archive_product(self, product_id: str) -> None:
        response = self.session.delete(
            f"{HUBSPOT_API}/crm/v3/objects/products/{product_id}",
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )

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

    def create_default_association(
        self, from_type: str, from_id: str, to_type: str, to_id: str
    ) -> None:
        response = self.session.put(
            f"{HUBSPOT_API}/crm/v4/objects/{from_type}/{from_id}/associations/default/{to_type}/{to_id}",
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
                retry_after=response.headers.get("Retry-After"),
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
