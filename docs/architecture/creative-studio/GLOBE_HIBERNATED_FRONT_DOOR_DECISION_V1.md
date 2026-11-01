# Globe: suspend front-door listeners during hibernation

Status: Accepted by Julio, 2026-11-01. Scope: explicit authorization to reduce retained cost while preserving data and easy restart.

While `globe_operating_state=hibernated`, provision zero global forwarding rules for the Studio HTTP/HTTPS entry. Preserve the global static IP, DNS, proxies, URL maps, certificate, backends, NEGs, buckets, secrets, images, IAM and SQL instance. `draining` and `active` restore both rules through the same Terraform source. Moved blocks preserve Terraform identity across singleton-to-count migration.

The only authorized deletes are `google_compute_global_forwarding_rule.front_door_http[0]` and `google_compute_global_forwarding_rule.front_door_https[0]`. A full saved plan must show precisely these two deletes and no other mutation. Never apply a targeted plan, destroy the address, wake SQL, or deploy services for this change.

Tradeoff: the Globe domain stops accepting HTTP/HTTPS during hibernation. Retaining the IP avoids DNS changes on restart but incurs idle address charges. October observed net CLP 33,414.87 included CLP 18,029.04 forwarding minimum. Modeled replacement idle-IP charge ~CLP 7,200 gives residual ~CLP 22,600 for a comparable 31-day period; FX, usage and late billing adjustments can change this. This is forecast, not realized saving.

Restart: follow the deep-hibernation runbook in order. The reviewed `draining` plan must recreate both listeners at the retained IP while starting SQL, with no other deletes/replacements. Verify certificate, frontend IP, listener ports and ready revisions before resuming callers or productive lanes. Do not resume external tenancy until SQL/API are ready and tenancy refreshed. Rollback of this listener-only change: restore both forwarding rules from the prior source through a reviewed full plan; no data restore or DNS change is expected. Never use rollback as authorization to activate jobs or SQL.
