-- Up Migration
-- TASK-529 Chile Tax Code Foundation
-- Canonical, jurisdiction-agnostic catalog of tax codes with effective dating.
-- Seeds Chile v1 VAT codes. Downstream (530/531/532/533) persists snapshots
-- derived from this catalog instead of raw tax_rate columns.

CREATE TABLE IF NOT EXISTS greenhouse_finance.tax_codes (
    id                UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tax_code          TEXT         NOT NULL,
    jurisdiction      TEXT         NOT NULL,
    kind              TEXT         NOT NULL,
    rate              NUMERIC(6,4),
    recoverability    TEXT         NOT NULL,
    label_es          TEXT         NOT NULL,
    label_en          TEXT,
    description       TEXT,
    effective_from    DATE         NOT NULL,
    effective_to      DATE,
    space_id          UUID,
    metadata          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT tax_codes_kind_check CHECK (kind IN (
        'vat_output',
        'vat_input_credit',
        'vat_input_non_recoverable',
        'vat_exempt',
        'vat_non_billable'
    )),
    CONSTRAINT tax_codes_recoverability_check CHECK (recoverability IN (
        'full',
        'partial',
        'none',
        'not_applicable'
    )),
    CONSTRAINT tax_codes_effective_window_check CHECK (
        effective_to IS NULL OR effective_to > effective_from
    ),
    CONSTRAINT tax_codes_rate_nonnegative_check CHECK (
        rate IS NULL OR rate >= 0
    )
);

COMMENT ON TABLE greenhouse_finance.tax_codes IS
    'TASK-529 canonical tax code catalog. Chile-first seed; jurisdiction-agnostic shape for future jurisdictions.';
COMMENT ON COLUMN greenhouse_finance.tax_codes.tax_code IS
    'Stable human identifier, e.g. cl_vat_19, cl_input_vat_credit_19. Consumers reference by this string.';
COMMENT ON COLUMN greenhouse_finance.tax_codes.jurisdiction IS
    'ISO 3166-1 alpha-2 country code (uppercase). Chile = CL.';
COMMENT ON COLUMN greenhouse_finance.tax_codes.kind IS
    'Semantic classification: vat_output (charged on sales), vat_input_credit (recoverable on purchases), vat_input_non_recoverable, vat_exempt, vat_non_billable.';
COMMENT ON COLUMN greenhouse_finance.tax_codes.rate IS
    'Decimal rate (0.19 = 19%). NULL for exempt / non-billable codes.';
COMMENT ON COLUMN greenhouse_finance.tax_codes.recoverability IS
    'full | partial | none | not_applicable. not_applicable applies to output taxes and exempt/non-billable.';
COMMENT ON COLUMN greenhouse_finance.tax_codes.effective_from IS
    'First day the code is applicable. Snapshots frozen at issuance time reference this window.';
COMMENT ON COLUMN greenhouse_finance.tax_codes.effective_to IS
    'Exclusive upper bound. NULL means currently active.';
COMMENT ON COLUMN greenhouse_finance.tax_codes.space_id IS
    'NULL = global default (Chile seed). Populated = tenant-specific override for the same (tax_code, jurisdiction, effective_from).';

CREATE UNIQUE INDEX IF NOT EXISTS tax_codes_global_uniq
    ON greenhouse_finance.tax_codes (tax_code, jurisdiction, effective_from)
    WHERE space_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tax_codes_scoped_uniq
    ON greenhouse_finance.tax_codes (tax_code, jurisdiction, effective_from, space_id)
    WHERE space_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tax_codes_lookup_idx
    ON greenhouse_finance.tax_codes (jurisdiction, tax_code, effective_from DESC);

CREATE INDEX IF NOT EXISTS tax_codes_space_id_idx
    ON greenhouse_finance.tax_codes (space_id)
    WHERE space_id IS NOT NULL;

-- Seed Chile v1 tax codes. Effective from 2026-01-01 retroactively covers the
-- current fiscal year. Upsert on (tax_code, jurisdiction, effective_from) when
-- global (space_id IS NULL) via tax_codes_global_uniq.

INSERT INTO greenhouse_finance.tax_codes
    (tax_code, jurisdiction, kind, rate, recoverability, label_es, label_en, description, effective_from, effective_to, space_id, metadata)
VALUES
    (
        'cl_vat_19',
        'CL',
        'vat_output',
        0.1900,
        'not_applicable',
        'IVA 19%',
        'Chile VAT 19% (output)',
        'Impuesto al Valor Agregado aplicable a ventas afectas en Chile.',
        DATE '2026-01-01',
        NULL,
        NULL,
        '{"sii_bucket": "debito_fiscal"}'::jsonb
    ),
    (
        'cl_vat_exempt',
        'CL',
        'vat_exempt',
        NULL,
        'not_applicable',
        'IVA Exento',
        'Chile VAT Exempt',
        'Operacion exenta de IVA segun articulo 12 del DL 825.',
        DATE '2026-01-01',
        NULL,
        NULL,
        '{"sii_bucket": "exento"}'::jsonb
    ),
    (
        'cl_vat_non_billable',
        'CL',
        'vat_non_billable',
        NULL,
        'not_applicable',
        'No Afecto a IVA',
        'Chile VAT Non-Billable',
        'Operacion fuera del hecho gravado del IVA (no afecta).',
        DATE '2026-01-01',
        NULL,
        NULL,
        '{"sii_bucket": "no_afecto"}'::jsonb
    ),
    (
        'cl_input_vat_credit_19',
        'CL',
        'vat_input_credit',
        0.1900,
        'full',
        'IVA Credito Fiscal 19%',
        'Chile Input VAT 19% (recoverable credit)',
        'IVA soportado en compras con derecho a credito fiscal completo.',
        DATE '2026-01-01',
        NULL,
        NULL,
        '{"sii_bucket": "credito_fiscal"}'::jsonb
    ),
    (
        'cl_input_vat_non_recoverable_19',
        'CL',
        'vat_input_non_recoverable',
        0.1900,
        'none',
        'IVA No Recuperable 19%',
        'Chile Input VAT 19% (non-recoverable)',
        'IVA soportado sin derecho a credito fiscal (ej. automoviles, gastos rechazados).',
        DATE '2026-01-01',
        NULL,
        NULL,
        '{"sii_bucket": "no_recuperable"}'::jsonb
    )
ON CONFLICT DO NOTHING;

-- Down Migration
DROP TABLE IF EXISTS greenhouse_finance.tax_codes;
