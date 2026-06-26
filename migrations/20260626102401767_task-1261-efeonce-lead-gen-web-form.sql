-- Up Migration
--
-- TASK-1261 — Primera migración comercial real: recrea el form HubSpot "Lead Gen - Web"
-- (embed en el WordPress público `/diseno-de-sitios-web/`, GUID de4593c3-00ee-481b-a35a-
-- 06fcb5022046) como Growth Form gobernado de Greenhouse. Campos + textos de ayuda + consent
-- FIELES al form HubSpot (autoridad: HubSpot Marketing Forms API). El destino HubSpot se
-- conserva vía el adapter seguro (TASK-1230, `hubspot_forms_secure_submit`) para que los leads
-- sigan llegando al CRM. Sembrado durable con ids estables (patrón grader-form), NO toca el
-- sitio en vivo (el swap del embed es el apply coordinado de TASK-1258). Vehículo del shadow
-- de TASK-1253 (autoridad de validación server-side: email/e164_phone/url).
--
-- delivery_mode='disabled': el destino HubSpot queda CABLEADO (parity) pero NO entrega durante
-- el shadow (no ensucia el CRM productivo). El cutover lo cambia a 'direct'.

SET search_path TO public, greenhouse_growth;

-- 1. Form definition (identidad estable).
INSERT INTO greenhouse_growth.form_definition
  (form_id, slug, name, form_kind, purpose, risk_profile, owner_team, status, default_locale)
VALUES (
  'fdef-efeonce-lead-gen-web',
  'efeonce-lead-gen-web',
  'Efeonce · Lead Gen - Web (Diseño de sitios web)',
  'lead_magnet',
  'Captura de leads comerciales del servicio Diseño de sitios web (migración del embed HubSpot Lead Gen - Web).',
  'medium',
  'growth',
  'active',
  'es-CL'
)
ON CONFLICT (form_id) DO NOTHING;

-- 2. Versión publicada v1. field_schema fiel (10 campos), validators del registry (TASK-1253:
--    email_syntax / e164_phone country=CL / url), autocomplete WHATWG. Textos de ayuda en
--    copy_refs_json.copy['<key>.help']; consent (aviso + checkbox + privacy URL) en el bloque
--    consent de copy_refs_json. "ventas anuales" = texto libre (fidelidad; select de rangos = follow-up).
INSERT INTO greenhouse_growth.form_version
  (form_version_id, form_id, version, status, locale,
   field_schema_json, copy_refs_json, success_behavior_json, ui_policy_json,
   consent_policy_version, published_at)
VALUES (
  'fver-efeonce-lead-gen-web-v1',
  'fdef-efeonce-lead-gen-web',
  1,
  'published',
  'es-CL',
  $field$[
    {"key":"firstName","type":"text","label":"¿Cuál es tu nombre?","required":true,"autocomplete":"given-name","validator":"text","maxLength":120},
    {"key":"lastName","type":"text","label":"¿Cuáles son tus apellidos?","required":true,"autocomplete":"family-name","validator":"text","maxLength":120},
    {"key":"email","type":"email","label":"Correo electrónico","required":true,"autocomplete":"email","inputMode":"email","validator":"email_syntax","maxLength":200},
    {"key":"phone","type":"tel","label":"Número de teléfono celular","required":false,"autocomplete":"tel","inputMode":"tel","validator":"e164_phone","validatorParams":{"country":"CL"},"maxLength":40},
    {"key":"companyName","type":"text","label":"¿Cuál es el nombre de la empresa?","required":false,"autocomplete":"organization","maxLength":200},
    {"key":"website","type":"url","label":"¿Cuál es la URL de tu empresa?","required":false,"autocomplete":"url","inputMode":"url","validator":"url","maxLength":300},
    {"key":"city","type":"text","label":"¿En que ciudad se encuentra tu empresa?","required":false,"autocomplete":"address-level2","maxLength":120},
    {"key":"role","type":"select","label":"¿Cuál es tu rol en la empresa?","required":false,"options":[
      {"value":"ceo_fundador","label":"CEO / Fundador(a)"},
      {"value":"gerente_marketing","label":"Gerente de Marketing"},
      {"value":"especialista_marketing","label":"Especialista en Marketing / Paid Media"},
      {"value":"especialista_ti","label":"Especialista de TI"},
      {"value":"procurement","label":"Procurement / Compras"},
      {"value":"agencia_aliada","label":"Agencia Aliada"},
      {"value":"otro","label":"Otro"}
    ]},
    {"key":"objective","type":"select","label":"¿Qué te gustaría conseguir?","placeholder":"Elige un objetivo","required":false,"options":[
      {"value":"branding","label":"Branding o rebranding"},
      {"value":"ui_ux","label":"Diseño UI/UX"},
      {"value":"contenido_grafico","label":"Contenido gráfico"},
      {"value":"animacion_motion","label":"Animación/Motion"},
      {"value":"otro","label":"Otro"}
    ]},
    {"key":"annualRevenue","type":"text","label":"¿Cuáles son las ventas anuales de tu empresa?","required":false,"maxLength":120}
  ]$field$::jsonb,
  $copy${
    "copy": {
      "firstName.help": "¿Cómo te llamas? Así sabremos cómo saludarte sin sonar a robot.",
      "lastName.help": "Tu apellido, para personalizar bien la conversación.",
      "email.help": "¿Dónde prefieres que te contactemos? Sin spam, sin robots. Solo estrategia.",
      "phone.help": "¿Podemos llamarte si es más rápido? Lo usaremos solo para esta conversación.",
      "companyName.help": "¿Cómo se llama tu empresa? Esto nos ayuda a entender mejor tu realidad.",
      "website.help": "¿Tienen sitio web? Lo revisamos antes para llegar preparados.",
      "city.help": "¿Dónde están? Así sabemos desde qué lugar están creciendo.",
      "role.help": "¿Cuál es tu rol en esta historia? Así adaptamos todo a ti.",
      "objective.help": "¿Qué meta concreta buscas? Cuéntanoslo y afinamos la propuesta.",
      "annualRevenue.help": "¿En qué nivel están hoy? Así calibramos mejor la solución.",
      "actions.submit": "Recibir diagnóstico sin costo"
    },
    "noticeText": "Efeonce Group SpA usará esta información solo para responder a esta conversación. No compartiremos tus datos. Ni ahora ni después.",
    "privacyUrl": "https://efeoncepro.com/politica-de-privacidad/",
    "checkboxes": [
      {"key":"marketingConsent","label":"Quiero recibir ideas estratégicas, contenidos y novedades de Efeonce.","required":true}
    ]
  }$copy$::jsonb,
  $success${"kind":"inline_message","message":"¡Gracias! Recibimos tu solicitud. Te contactaremos pronto con tu diagnóstico sin costo."}$success$::jsonb,
  $ui${"composition":"static"}$ui$::jsonb,
  'efeonce-lead-gen-web-consent-v1',
  NOW()
)
ON CONFLICT (form_version_id) DO NOTHING;

-- 3. Host surface para el render/submit gobernado. Origins reales del sitio público +
--    un origin de prueba de staging para el shadow de TASK-1253 (submitForm exige surface
--    activa + origin allowlisteado). El swap real del embed (TASK-1258) reusa esta surface.
INSERT INTO greenhouse_growth.form_host_surface
  (surface_id, surface_kind, surface_name, origin_allowlist_json, allowed_form_slugs_json, renderer_channel, status)
VALUES (
  'fhsf-efeonce-lead-gen-web',
  'wordpress',
  'Efeonce público — Diseño de sitios web',
  $origins$["https://efeoncepro.com","https://www.efeoncepro.com","https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app","https://shadow.local"]$origins$::jsonb,
  $slugs$["efeonce-lead-gen-web"]$slugs$::jsonb,
  'stable',
  'active'
)
ON CONFLICT (surface_id) DO NOTHING;

-- 4. Destino HubSpot seguro (TASK-1230). mapping_json: portalId + formGuid del form real +
--    fieldMapping (Greenhouse key → HubSpot property name) + consentText. delivery_mode='disabled':
--    cableado pero NO entrega durante el shadow (no ensucia el CRM); el cutover lo pasa a 'direct'.
INSERT INTO greenhouse_growth.form_destination
  (form_version_id, provider, adapter_kind, adapter_version, delivery_mode, mapping_json)
VALUES (
  'fver-efeonce-lead-gen-web-v1',
  'hubspot',
  'hubspot_forms_secure_submit',
  'hubspot-secure-v1',
  'disabled',
  $map${
    "portalId": "48713323",
    "formGuid": "de4593c3-00ee-481b-a35a-06fcb5022046",
    "consentText": "Efeonce Group SpA usará esta información solo para responder a esta conversación. No compartiremos tus datos. Ni ahora ni después.",
    "fieldMapping": {
      "firstName": "firstname",
      "lastName": "lastname",
      "email": "email",
      "phone": "phone",
      "companyName": "name",
      "website": "website",
      "city": "en_que_ciudad_se_encuentra_tu_empresa_",
      "role": "rol___cargo",
      "objective": "objetivo_diseno",
      "annualRevenue": "cuales_son_las_ventas_anuales_de_tu_empresa_"
    }
  }$map$::jsonb
)
ON CONFLICT DO NOTHING;

-- 5. Anti pre-up-marker: aborta si el form publicado no quedó realmente sembrado.
DO $$
DECLARE published_ok boolean; fields_ok boolean; dest_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM greenhouse_growth.form_version
    WHERE form_version_id = 'fver-efeonce-lead-gen-web-v1' AND status = 'published'
  ) INTO published_ok;

  SELECT (COUNT(*) = 10) FROM greenhouse_growth.form_version,
         jsonb_array_elements(field_schema_json) AS f
   WHERE form_version_id = 'fver-efeonce-lead-gen-web-v1' INTO fields_ok;

  SELECT EXISTS (
    SELECT 1 FROM greenhouse_growth.form_destination
    WHERE form_version_id = 'fver-efeonce-lead-gen-web-v1' AND provider = 'hubspot'
  ) INTO dest_ok;

  IF NOT (published_ok AND fields_ok AND dest_ok) THEN
    RAISE EXCEPTION 'TASK-1261 anti pre-up-marker: form NO sembrado completo (published=% fields10=% dest=%).',
      published_ok, fields_ok, dest_ok;
  END IF;
END
$$;

-- Down Migration

-- Reversible: el destino + surface + versión + definición son additive. NO DELETE de la versión
-- si tiene submissions (FK RESTRICT) → archivar. El destino/surface/definición sí se quitan.
DELETE FROM greenhouse_growth.form_destination WHERE form_version_id = 'fver-efeonce-lead-gen-web-v1';

UPDATE greenhouse_growth.form_version
SET status = 'archived'
WHERE form_version_id = 'fver-efeonce-lead-gen-web-v1';

DELETE FROM greenhouse_growth.form_host_surface WHERE surface_id = 'fhsf-efeonce-lead-gen-web';

DELETE FROM greenhouse_growth.form_definition
WHERE form_id = 'fdef-efeonce-lead-gen-web'
  AND NOT EXISTS (
    SELECT 1 FROM greenhouse_growth.form_version
    WHERE form_id = 'fdef-efeonce-lead-gen-web' AND status <> 'archived'
  );
