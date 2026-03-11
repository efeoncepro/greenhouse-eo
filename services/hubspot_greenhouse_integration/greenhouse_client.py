from typing import Any

import requests


class GreenhouseIntegrationError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _parse_error(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text or response.reason

    message = payload.get("error") or payload.get("message") or payload.get("status")
    if message:
        return str(message)

    return response.reason


class GreenhouseClient:
    def __init__(self, *, base_url: str, api_token: str, timeout_seconds: int):
        normalized_base_url = base_url.strip().rstrip("/")
        normalized_api_token = api_token.strip()
        if not normalized_base_url:
            raise GreenhouseIntegrationError("GREENHOUSE_BASE_URL is not set")
        if not normalized_api_token:
            raise GreenhouseIntegrationError("GREENHOUSE_INTEGRATION_API_TOKEN is not set")
        self.base_url = normalized_base_url
        self.api_token = normalized_api_token
        self.timeout_seconds = timeout_seconds
        self.session = requests.Session()

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

    def sync_capabilities(
        self,
        *,
        source_system: str,
        source_object_type: str,
        source_object_id: str,
        business_lines: list[str],
        service_modules: list[str],
    ) -> dict[str, Any]:
        payload = {
            "target": {
                "sourceSystem": source_system,
                "sourceObjectType": source_object_type,
                "sourceObjectId": source_object_id,
            },
            "sync": {
                "sourceSystem": source_system,
                "sourceObjectType": source_object_type,
                "sourceObjectId": source_object_id,
                "confidence": "high",
                "businessLines": business_lines,
                "serviceModules": service_modules,
            },
        }
        response = self.session.post(
            f"{self.base_url}/api/integrations/v1/tenants/capabilities/sync",
            headers=self._headers(),
            json=payload,
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise GreenhouseIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()
