-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_commercial.master_agreements (
  msa_id text PRIMARY KEY DEFAULT ('msa-' || gen_random_uuid()::text),
  msa_number text NOT NULL UNIQUE,
  organization_id text NOT NULL REFERENCES greenhouse_core.organizations(organization_id) ON DELETE RESTRICT,
  client_id text REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL,
  title text NOT NULL,
  counterparty_name text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'superseded')),
  effective_date date NOT NULL,
  expiration_date date,
  auto_renewal boolean NOT NULL DEFAULT FALSE,
  renewal_frequency_months integer,
  renewal_notice_days integer NOT NULL DEFAULT 30,
  governing_law text,
  jurisdiction text,
  payment_terms_days integer,
  currency text NOT NULL DEFAULT 'CLP',
  signed_at timestamptz,
  signed_by_client text,
  signed_by_efeonce text,
  signed_document_asset_id text REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  signature_provider text
    CHECK (signature_provider IS NULL OR signature_provider IN ('zapsign')),
  signature_status text,
  signature_document_token text,
  signature_last_synced_at timestamptz,
  signature_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_notes text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT master_agreements_renewal_frequency_chk
    CHECK (
      (auto_renewal = FALSE AND renewal_frequency_months IS NULL)
      OR (auto_renewal = TRUE AND renewal_frequency_months IS NOT NULL AND renewal_frequency_months > 0)
    ),
  CONSTRAINT master_agreements_dates_chk
    CHECK (expiration_date IS NULL OR expiration_date >= effective_date),
  CONSTRAINT master_agreements_notice_chk
    CHECK (renewal_notice_days >= 0),
  CONSTRAINT master_agreements_payment_terms_chk
    CHECK (payment_terms_days IS NULL OR payment_terms_days >= 0)
);

CREATE INDEX IF NOT EXISTS idx_master_agreements_org_status
  ON greenhouse_commercial.master_agreements (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_master_agreements_client_status
  ON greenhouse_commercial.master_agreements (client_id, status);

CREATE INDEX IF NOT EXISTS idx_master_agreements_expiration
  ON greenhouse_commercial.master_agreements (expiration_date)
  WHERE expiration_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_master_agreements_signature_token
  ON greenhouse_commercial.master_agreements (signature_document_token)
  WHERE signature_document_token IS NOT NULL;

COMMENT ON TABLE greenhouse_commercial.master_agreements IS
  'Marco legal umbrella por organización. Los contracts/SOWs pueden colgar de un MSA y heredar sus cláusulas vigentes.';

CREATE TABLE IF NOT EXISTS greenhouse_commercial.clause_library (
  clause_id text NOT NULL DEFAULT ('cl-' || gen_random_uuid()::text),
  clause_code text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  language text NOT NULL DEFAULT 'es'
    CHECK (language IN ('es', 'en')),
  category text NOT NULL
    CHECK (category IN ('legal', 'payment', 'privacy', 'security', 'ip', 'sla', 'general')),
  title text NOT NULL,
  summary text,
  body_template text NOT NULL,
  default_variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  required boolean NOT NULL DEFAULT FALSE,
  active boolean NOT NULL DEFAULT TRUE,
  sort_order integer NOT NULL DEFAULT 100,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clause_id),
  CONSTRAINT clause_library_unique_code_version_lang UNIQUE (clause_code, version, language)
);

CREATE INDEX IF NOT EXISTS idx_clause_library_active_category
  ON greenhouse_commercial.clause_library (category, sort_order)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_clause_library_code
  ON greenhouse_commercial.clause_library (clause_code, version DESC, language);

COMMENT ON TABLE greenhouse_commercial.clause_library IS
  'Biblioteca versionada de cláusulas legales reusable para MSAs. Complementa terms_library; no reemplaza snapshots quote-level.';

CREATE TABLE IF NOT EXISTS greenhouse_commercial.master_agreement_clauses (
  msa_clause_id text PRIMARY KEY DEFAULT ('mac-' || gen_random_uuid()::text),
  msa_id text NOT NULL REFERENCES greenhouse_commercial.master_agreements(msa_id) ON DELETE CASCADE,
  clause_id text NOT NULL REFERENCES greenhouse_commercial.clause_library(clause_id) ON DELETE RESTRICT,
  clause_code text NOT NULL,
  clause_version integer NOT NULL,
  clause_language text NOT NULL DEFAULT 'es'
    CHECK (clause_language IN ('es', 'en')),
  sort_order integer NOT NULL DEFAULT 100,
  included boolean NOT NULL DEFAULT TRUE,
  body_override text,
  variables_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_from date,
  effective_to date,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT master_agreement_clauses_unique UNIQUE (msa_id, clause_id, clause_language),
  CONSTRAINT master_agreement_clauses_dates_chk
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
  CONSTRAINT master_agreement_clauses_catalog_fk
    FOREIGN KEY (clause_code, clause_version, clause_language)
    REFERENCES greenhouse_commercial.clause_library (clause_code, version, language)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_master_agreement_clauses_msa
  ON greenhouse_commercial.master_agreement_clauses (msa_id, included, sort_order);

CREATE INDEX IF NOT EXISTS idx_master_agreement_clauses_clause
  ON greenhouse_commercial.master_agreement_clauses (clause_code, clause_version, clause_language);

COMMENT ON TABLE greenhouse_commercial.master_agreement_clauses IS
  'Join versionado entre un MSA específico y la biblioteca de cláusulas, con overrides puntuales por acuerdo.';

ALTER TABLE greenhouse_commercial.contracts
  ADD CONSTRAINT contracts_msa_fk
  FOREIGN KEY (msa_id)
  REFERENCES greenhouse_commercial.master_agreements(msa_id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_msa_id
  ON greenhouse_commercial.contracts (msa_id)
  WHERE msa_id IS NOT NULL;

INSERT INTO greenhouse_commercial.clause_library (
  clause_code,
  version,
  language,
  category,
  title,
  summary,
  body_template,
  default_variables,
  required,
  active,
  sort_order,
  created_by,
  updated_by
)
VALUES
  (
    'DEFINED_SCOPE_ORDER_OF_PRECEDENCE',
    1,
    'es',
    'general',
    'Orden de prelación documental',
    'Define la jerarquía entre MSA, SOW, anexos y órdenes de compra.',
    'En caso de conflicto entre este Master Services Agreement y un Statement of Work asociado, prevalecerá el Statement of Work únicamente respecto del alcance, cronograma, entregables y pricing expresamente definidos en dicho documento. Para toda otra materia regirá este Master Services Agreement.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    10,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'DEFINED_SCOPE_ORDER_OF_PRECEDENCE',
    1,
    'en',
    'general',
    'Order of precedence',
    'Defines hierarchy between MSA, SOW, appendices, and purchase orders.',
    'If a conflict exists between this Master Services Agreement and an associated Statement of Work, the Statement of Work will prevail only with respect to scope, timeline, deliverables, and pricing expressly stated therein. For all other matters, this Master Services Agreement will govern.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    10,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'SERVICES_AND_DELIVERABLES',
    1,
    'es',
    'general',
    'Servicios y entregables',
    'Establece que cada SOW concreta los entregables y criterios de aceptación.',
    'Los servicios y entregables específicos serán definidos en cada Statement of Work suscrito por las partes. Cada SOW identificará responsables, hitos, supuestos, dependencias y criterios de aceptación aplicables al servicio contratado.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    20,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'SERVICES_AND_DELIVERABLES',
    1,
    'en',
    'general',
    'Services and deliverables',
    'States that each SOW defines deliverables and acceptance criteria.',
    'Specific services and deliverables will be described in each Statement of Work executed by the parties. Each SOW will identify owners, milestones, assumptions, dependencies, and acceptance criteria applicable to the contracted service.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    20,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'PAYMENT_TERMS_STANDARD',
    1,
    'es',
    'payment',
    'Condiciones de pago',
    'Marco estándar de facturación y vencimiento.',
    'Efeonce emitirá la documentación de cobro conforme al calendario definido en cada SOW. Salvo pacto distinto en el SOW correspondiente, el cliente pagará las facturas válidamente emitidas dentro de {{payment_terms_days}} días corridos desde su recepción.',
    '{"payment_terms_days":30}'::jsonb,
    TRUE,
    TRUE,
    30,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'PAYMENT_TERMS_STANDARD',
    1,
    'en',
    'payment',
    'Payment terms',
    'Standard billing and due date framework.',
    'Efeonce will issue billing documents according to the calendar defined in each applicable SOW. Unless otherwise agreed in the relevant SOW, the client will pay validly issued invoices within {{payment_terms_days}} calendar days after receipt.',
    '{"payment_terms_days":30}'::jsonb,
    TRUE,
    TRUE,
    30,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'CONFIDENTIALITY_AND_NDA',
    1,
    'es',
    'privacy',
    'Confidencialidad',
    'Cláusula base de NDA bilateral.',
    'Cada parte mantendrá bajo estricta confidencialidad la información técnica, comercial, operativa o financiera de la otra parte a la que tenga acceso con motivo de este acuerdo, y la utilizará exclusivamente para la ejecución de los servicios contratados.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    40,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'CONFIDENTIALITY_AND_NDA',
    1,
    'en',
    'privacy',
    'Confidentiality',
    'Baseline mutual NDA clause.',
    'Each party will keep confidential any technical, commercial, operational, or financial information of the other party accessed in connection with this agreement and will use such information solely for performance of the contracted services.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    40,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'INTELLECTUAL_PROPERTY_DELIVERABLES',
    1,
    'es',
    'ip',
    'Propiedad intelectual de entregables',
    'Diferencia background IP y entregables pagados.',
    'Cada parte conservará la titularidad de su propiedad intelectual preexistente. Una vez pagados en su totalidad los importes exigibles del SOW aplicable, el cliente recibirá los derechos de uso o titularidad sobre los entregables expresamente pactados en dicho SOW, con exclusión de frameworks, know-how, herramientas y aceleradores preexistentes de Efeonce.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    50,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'INTELLECTUAL_PROPERTY_DELIVERABLES',
    1,
    'en',
    'ip',
    'Intellectual property in deliverables',
    'Separates background IP from paid deliverables.',
    'Each party retains ownership of its pre-existing intellectual property. Once all amounts due under the applicable SOW have been paid in full, the client will receive the use rights or ownership over the deliverables expressly agreed in such SOW, excluding Efeonce''s pre-existing frameworks, know-how, tools, and accelerators.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    50,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'DATA_PROTECTION_AND_SECURITY',
    1,
    'es',
    'security',
    'Protección de datos y seguridad',
    'Marco general de seguridad y tratamiento de datos.',
    'Las partes implementarán medidas razonables de seguridad administrativas, técnicas y organizacionales acordes con la naturaleza de la información tratada. Cuando Efeonce procese datos personales por cuenta del cliente, dicho tratamiento se limitará a la finalidad instruida y se sujetará a la normativa aplicable y a los anexos de privacidad vigentes.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    60,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'DATA_PROTECTION_AND_SECURITY',
    1,
    'en',
    'security',
    'Data protection and security',
    'General framework for security and data handling.',
    'The parties will implement reasonable administrative, technical, and organizational security measures appropriate to the nature of the information processed. When Efeonce processes personal data on the client''s behalf, such processing will be limited to the instructed purpose and will remain subject to applicable law and current privacy appendices.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    60,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'LIMITATION_OF_LIABILITY',
    1,
    'es',
    'legal',
    'Limitación de responsabilidad',
    'Tope estándar de responsabilidad.',
    'Salvo en casos de dolo, fraude, incumplimiento grave de confidencialidad o materias no limitables por ley, la responsabilidad agregada de cualquiera de las partes derivada de este acuerdo no excederá el monto efectivamente pagado por el cliente a Efeonce durante los doce meses previos al hecho que origina la reclamación.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    70,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'LIMITATION_OF_LIABILITY',
    1,
    'en',
    'legal',
    'Limitation of liability',
    'Standard liability cap.',
    'Except for fraud, wilful misconduct, material confidentiality breaches, or matters that cannot be limited by law, either party''s aggregate liability arising out of this agreement will not exceed the amount actually paid by the client to Efeonce during the twelve months preceding the event giving rise to the claim.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    70,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'NON_SOLICITATION',
    1,
    'es',
    'legal',
    'No captación',
    'Protege al equipo asignado y a la relación comercial.',
    'Durante la vigencia de este acuerdo y por doce meses posteriores a su terminación, ninguna de las partes podrá inducir o contratar directamente al personal clave presentado por la otra parte en el contexto del servicio, salvo autorización escrita previa o pago de la tarifa de reemplazo pactada.',
    '{}'::jsonb,
    FALSE,
    TRUE,
    80,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'NON_SOLICITATION',
    1,
    'en',
    'legal',
    'Non-solicitation',
    'Protects assigned staff and the commercial relationship.',
    'During the term of this agreement and for twelve months after termination, neither party may solicit or directly hire key personnel introduced by the other party in connection with the services, except with prior written consent or payment of the agreed replacement fee.',
    '{}'::jsonb,
    FALSE,
    TRUE,
    80,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'TERMINATION_FOR_CONVENIENCE',
    1,
    'es',
    'legal',
    'Terminación por conveniencia',
    'Permite cierre ordenado con aviso previo.',
    'Cualquiera de las partes podrá terminar este acuerdo por conveniencia mediante aviso escrito con al menos {{termination_notice_days}} días de anticipación. Las obligaciones devengadas, los montos pendientes y las cláusulas que por su naturaleza deban sobrevivir permanecerán vigentes tras la terminación.',
    '{"termination_notice_days":30}'::jsonb,
    FALSE,
    TRUE,
    90,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'TERMINATION_FOR_CONVENIENCE',
    1,
    'en',
    'legal',
    'Termination for convenience',
    'Allows orderly offboarding with prior notice.',
    'Either party may terminate this agreement for convenience upon at least {{termination_notice_days}} days'' prior written notice. Accrued obligations, outstanding amounts, and clauses that by their nature must survive will remain in effect after termination.',
    '{"termination_notice_days":30}'::jsonb,
    FALSE,
    TRUE,
    90,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'GOVERNING_LAW_AND_DISPUTES',
    1,
    'es',
    'legal',
    'Ley aplicable y disputas',
    'Identifica ley y jurisdicción base.',
    'Este acuerdo se regirá por las leyes de {{governing_law}} y cualquier controversia se someterá a la jurisdicción de {{jurisdiction}}, sin perjuicio de que las partes intenten primero una resolución ejecutiva de buena fe.',
    '{"governing_law":"Chile","jurisdiction":"Santiago de Chile"}'::jsonb,
    TRUE,
    TRUE,
    100,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'GOVERNING_LAW_AND_DISPUTES',
    1,
    'en',
    'legal',
    'Governing law and disputes',
    'Identifies governing law and jurisdiction.',
    'This agreement will be governed by the laws of {{governing_law}}, and any dispute will be submitted to the courts of {{jurisdiction}}, without prejudice to the parties first attempting a good-faith executive resolution.',
    '{"governing_law":"Chile","jurisdiction":"Santiago de Chile"}'::jsonb,
    TRUE,
    TRUE,
    100,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'CHANGE_CONTROL',
    1,
    'es',
    'general',
    'Control de cambios',
    'Canaliza cambios de alcance a SOWs y anexos.',
    'Cualquier cambio material en alcance, supuestos, cronograma, capacidad asignada o pricing deberá formalizarse mediante un change order o un nuevo Statement of Work aprobado por ambas partes antes de su ejecución.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    110,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'CHANGE_CONTROL',
    1,
    'en',
    'general',
    'Change control',
    'Channels material scope changes through SOWs and addenda.',
    'Any material change to scope, assumptions, timeline, assigned capacity, or pricing must be formalized through a change order or new Statement of Work approved by both parties before execution.',
    '{}'::jsonb,
    TRUE,
    TRUE,
    110,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'AUDIT_AND_COMPLIANCE_COOPERATION',
    1,
    'es',
    'security',
    'Cooperación de auditoría y compliance',
    'Base para due diligence y requerimientos regulatorios razonables.',
    'Cuando resulte razonablemente necesario para fines regulatorios, de seguridad o auditoría del cliente, Efeonce cooperará de buena fe con solicitudes documentales proporcionales relacionadas con los servicios prestados, sujeto a confidencialidad, costos razonables y límites operativos acordados.',
    '{}'::jsonb,
    FALSE,
    TRUE,
    120,
    'task-461-seed',
    'task-461-seed'
  ),
  (
    'AUDIT_AND_COMPLIANCE_COOPERATION',
    1,
    'en',
    'security',
    'Audit and compliance cooperation',
    'Baseline for due diligence and reasonable regulatory requests.',
    'When reasonably necessary for regulatory, security, or client audit purposes, Efeonce will cooperate in good faith with proportionate documentary requests related to the services provided, subject to confidentiality, reasonable cost recovery, and agreed operational limits.',
    '{}'::jsonb,
    FALSE,
    TRUE,
    120,
    'task-461-seed',
    'task-461-seed'
  );

-- Down Migration

DROP INDEX IF EXISTS idx_contracts_msa_id;

ALTER TABLE greenhouse_commercial.contracts
  DROP CONSTRAINT IF EXISTS contracts_msa_fk;

DROP TABLE IF EXISTS greenhouse_commercial.master_agreement_clauses;
DROP TABLE IF EXISTS greenhouse_commercial.clause_library;
DROP TABLE IF EXISTS greenhouse_commercial.master_agreements;
