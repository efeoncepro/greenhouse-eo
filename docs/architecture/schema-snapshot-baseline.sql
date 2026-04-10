--
-- PostgreSQL database dump
--

\restrict bs3NERE9Z8mfcsVKfRwiXdjgVtodi58paZxqi9QdWLTXKokz7wrRmHe97p5Sq8P

-- Dumped from database version 16.13
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: greenhouse_ai; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA greenhouse_ai;


--
-- Name: greenhouse_core; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA greenhouse_core;


--
-- Name: greenhouse_cost_intelligence; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA greenhouse_cost_intelligence;


--
-- Name: greenhouse_crm; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA greenhouse_crm;


--
-- Name: greenhouse_delivery; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA greenhouse_delivery;


--
-- Name: greenhouse_finance; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA greenhouse_finance;


--
-- Name: greenhouse_hr; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA greenhouse_hr;


--
-- Name: greenhouse_notifications; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA greenhouse_notifications;


--
-- Name: greenhouse_payroll; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA greenhouse_payroll;


--
-- Name: greenhouse_serving; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA greenhouse_serving;


--
-- Name: greenhouse_sync; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA greenhouse_sync;


--
-- Name: set_identity_public_id(); Type: FUNCTION; Schema: greenhouse_core; Owner: -
--

CREATE FUNCTION greenhouse_core.set_identity_public_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := nextval('greenhouse_core.identity_profile_serial');
  END IF;
  NEW.public_id := 'EO-ID' || LPAD(NEW.serial_number::text, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: reporting_lines_sync_snapshot_trigger(); Type: FUNCTION; Schema: greenhouse_core; Owner: -
--

CREATE FUNCTION greenhouse_core.reporting_lines_sync_snapshot_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM greenhouse_core.sync_current_reports_to_snapshot(OLD.member_id);
    RETURN OLD;
  END IF;

  PERFORM greenhouse_core.sync_current_reports_to_snapshot(NEW.member_id);
  RETURN NEW;
END;
$$;


--
-- Name: sync_current_reports_to_snapshot(text); Type: FUNCTION; Schema: greenhouse_core; Owner: -
--

CREATE FUNCTION greenhouse_core.sync_current_reports_to_snapshot(target_member_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  resolved_supervisor_member_id TEXT;
BEGIN
  SELECT rl.supervisor_member_id
  INTO resolved_supervisor_member_id
  FROM greenhouse_core.reporting_lines AS rl
  WHERE rl.member_id = target_member_id
    AND rl.effective_from <= CURRENT_TIMESTAMP
    AND (rl.effective_to IS NULL OR rl.effective_to > CURRENT_TIMESTAMP)
  ORDER BY rl.effective_from DESC, rl.created_at DESC
  LIMIT 1;

  UPDATE greenhouse_core.members
  SET
    reports_to_member_id = resolved_supervisor_member_id,
    updated_at = CURRENT_TIMESTAMP
  WHERE member_id = target_member_id
    AND reports_to_member_id IS DISTINCT FROM resolved_supervisor_member_id;
END;
$$;


--
-- Name: touch_reporting_lines_updated_at(); Type: FUNCTION; Schema: greenhouse_core; Owner: -
--

CREATE FUNCTION greenhouse_core.touch_reporting_lines_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: touch_workflow_approval_snapshots_updated_at(); Type: FUNCTION; Schema: greenhouse_hr; Owner: -
--

CREATE FUNCTION greenhouse_hr.touch_workflow_approval_snapshots_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: credit_ledger; Type: TABLE; Schema: greenhouse_ai; Owner: -
--

CREATE TABLE greenhouse_ai.credit_ledger (
    ledger_id text NOT NULL,
    wallet_id text NOT NULL,
    request_id text,
    entry_type text NOT NULL,
    credit_amount integer NOT NULL,
    balance_before integer NOT NULL,
    balance_after integer NOT NULL,
    consumed_by_member_id text,
    client_id text,
    notion_task_id text,
    notion_project_id text,
    project_name text,
    asset_description text,
    unit_cost numeric,
    cost_currency text,
    total_cost numeric,
    total_cost_clp numeric,
    reload_reason text,
    reload_reference text,
    notes text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: credit_wallets; Type: TABLE; Schema: greenhouse_ai; Owner: -
--

CREATE TABLE greenhouse_ai.credit_wallets (
    wallet_id text NOT NULL,
    wallet_name text NOT NULL,
    wallet_scope text NOT NULL,
    client_id text,
    tool_id text NOT NULL,
    credit_unit_name text NOT NULL,
    initial_balance integer NOT NULL,
    current_balance integer NOT NULL,
    reserved_balance integer DEFAULT 0 NOT NULL,
    monthly_limit integer,
    monthly_consumed integer DEFAULT 0 NOT NULL,
    monthly_reset_day integer DEFAULT 1 NOT NULL,
    low_balance_threshold integer,
    valid_from date NOT NULL,
    valid_until date,
    wallet_status text DEFAULT 'active'::text NOT NULL,
    notes text,
    alert_sent boolean DEFAULT false NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: member_tool_licenses; Type: TABLE; Schema: greenhouse_ai; Owner: -
--

CREATE TABLE greenhouse_ai.member_tool_licenses (
    license_id text NOT NULL,
    member_id text NOT NULL,
    tool_id text NOT NULL,
    license_status text NOT NULL,
    activated_at date,
    expires_at date,
    access_level text,
    license_key text,
    account_email text,
    notes text,
    assigned_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: nexa_feedback; Type: TABLE; Schema: greenhouse_ai; Owner: -
--

CREATE TABLE greenhouse_ai.nexa_feedback (
    feedback_id uuid DEFAULT gen_random_uuid() NOT NULL,
    response_id text NOT NULL,
    user_id text NOT NULL,
    client_id text NOT NULL,
    sentiment text NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nexa_feedback_sentiment_check CHECK ((sentiment = ANY (ARRAY['positive'::text, 'negative'::text])))
);


--
-- Name: nexa_messages; Type: TABLE; Schema: greenhouse_ai; Owner: -
--

CREATE TABLE greenhouse_ai.nexa_messages (
    message_id text NOT NULL,
    thread_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    tool_invocations jsonb,
    suggestions text[] DEFAULT ARRAY[]::text[] NOT NULL,
    model_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nexa_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: nexa_threads; Type: TABLE; Schema: greenhouse_ai; Owner: -
--

CREATE TABLE greenhouse_ai.nexa_threads (
    thread_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    client_id text NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tool_catalog; Type: TABLE; Schema: greenhouse_ai; Owner: -
--

CREATE TABLE greenhouse_ai.tool_catalog (
    tool_id text NOT NULL,
    tool_name text NOT NULL,
    provider_id text NOT NULL,
    vendor text,
    tool_category text NOT NULL,
    tool_subcategory text,
    cost_model text NOT NULL,
    subscription_amount numeric,
    subscription_currency text,
    subscription_billing_cycle text,
    subscription_seats integer,
    credit_unit_name text,
    credit_unit_cost numeric,
    credit_unit_currency text,
    credits_included_monthly integer,
    fin_supplier_id text,
    description text,
    website_url text,
    icon_url text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: asset_access_log; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.asset_access_log (
    access_log_id text NOT NULL,
    asset_id text NOT NULL,
    action text NOT NULL,
    actor_user_id text,
    occurred_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT asset_access_log_action_check CHECK ((action = ANY (ARRAY['download'::text, 'delete'::text, 'attach'::text, 'upload'::text])))
);


--
-- Name: assets; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.assets (
    asset_id text NOT NULL,
    public_id text NOT NULL,
    visibility text NOT NULL,
    status text NOT NULL,
    bucket_name text NOT NULL,
    object_path text NOT NULL,
    filename text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    retention_class text NOT NULL,
    owner_aggregate_type text NOT NULL,
    owner_aggregate_id text,
    owner_client_id text,
    owner_space_id text,
    owner_member_id text,
    uploaded_by_user_id text,
    attached_by_user_id text,
    deleted_by_user_id text,
    upload_source text DEFAULT 'user'::text NOT NULL,
    download_count integer DEFAULT 0 NOT NULL,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    attached_at timestamp with time zone,
    deleted_at timestamp with time zone,
    last_downloaded_at timestamp with time zone,
    CONSTRAINT assets_size_bytes_check CHECK ((size_bytes >= 0)),
    CONSTRAINT assets_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'attached'::text, 'orphaned'::text, 'deleted'::text]))),
    CONSTRAINT assets_upload_source_check CHECK ((upload_source = ANY (ARRAY['user'::text, 'system'::text]))),
    CONSTRAINT assets_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'private'::text])))
);


--
-- Name: audit_events; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.audit_events (
    event_id text NOT NULL,
    event_type text NOT NULL,
    actor_user_id text,
    target_user_id text,
    target_client_id text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: auth_tokens; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.auth_tokens (
    token_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    email text NOT NULL,
    client_id text,
    token_type text NOT NULL,
    token_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    used_at timestamp with time zone,
    CONSTRAINT auth_tokens_token_type_check CHECK ((token_type = ANY (ARRAY['reset'::text, 'invite'::text, 'verify'::text])))
);


--
-- Name: business_line_metadata; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.business_line_metadata (
    module_code text NOT NULL,
    label text NOT NULL,
    label_full text,
    claim text,
    loop_phase text,
    loop_phase_label text,
    lead_identity_profile_id text,
    lead_name text,
    color_hex text NOT NULL,
    color_bg text,
    icon_name text,
    hubspot_enum_value text NOT NULL,
    notion_label text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: campaign_project_links; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.campaign_project_links (
    campaign_project_link_id text NOT NULL,
    campaign_id text NOT NULL,
    space_id text NOT NULL,
    project_source_system text DEFAULT 'notion'::text NOT NULL,
    project_source_id text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: campaigns; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.campaigns (
    campaign_id text NOT NULL,
    eo_id text NOT NULL,
    slug text NOT NULL,
    space_id text NOT NULL,
    display_name text NOT NULL,
    description text,
    campaign_type text DEFAULT 'campaign'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    planned_launch_date date,
    actual_launch_date date,
    owner_user_id text,
    created_by_user_id text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    channels text[] DEFAULT '{}'::text[] NOT NULL,
    notes text,
    budget_clp numeric(14,2),
    currency text DEFAULT 'CLP'::text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT campaigns_campaign_type_check CHECK ((campaign_type = ANY (ARRAY['campaign'::text, 'launch'::text, 'seasonal'::text, 'sprint_group'::text, 'always_on'::text]))),
    CONSTRAINT campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'planning'::text, 'active'::text, 'paused'::text, 'completed'::text, 'archived'::text])))
);


--
-- Name: campaigns_eo_id_seq; Type: SEQUENCE; Schema: greenhouse_core; Owner: -
--

CREATE SEQUENCE greenhouse_core.campaigns_eo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_feature_flags; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.client_feature_flags (
    flag_id text NOT NULL,
    client_id text NOT NULL,
    flag_code text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: client_service_modules; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.client_service_modules (
    assignment_id text NOT NULL,
    client_id text NOT NULL,
    module_id text NOT NULL,
    source_system text,
    source_reference text,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    assigned_at timestamp with time zone,
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: client_team_assignments; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.client_team_assignments (
    assignment_id text NOT NULL,
    client_id text NOT NULL,
    member_id text NOT NULL,
    fte_allocation numeric(5,3) DEFAULT 0 NOT NULL,
    hours_per_month integer,
    role_title_override text,
    active boolean DEFAULT true NOT NULL,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    contracted_hours_month integer,
    assignment_type text DEFAULT 'internal'::text NOT NULL,
    CONSTRAINT client_team_assignments_assignment_type_check CHECK ((assignment_type = ANY (ARRAY['internal'::text, 'staff_augmentation'::text])))
);


--
-- Name: client_users; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.client_users (
    user_id text NOT NULL,
    public_id text,
    client_id text,
    identity_profile_id text,
    email text,
    full_name text,
    tenant_type text DEFAULT 'client'::text NOT NULL,
    auth_mode text,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    microsoft_oid text,
    microsoft_tenant_id text,
    microsoft_email text,
    google_sub text,
    google_email text,
    avatar_url text,
    password_hash text,
    password_hash_algorithm text,
    timezone text DEFAULT 'America/Santiago'::text,
    default_portal_home_path text,
    last_login_provider text,
    member_id text
);


--
-- Name: clients; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.clients (
    client_id text NOT NULL,
    public_id text,
    client_name text NOT NULL,
    legal_name text,
    tenant_type text DEFAULT 'client'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    hubspot_company_id text,
    timezone text,
    country_code text,
    billing_currency text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: departments; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.departments (
    department_id text NOT NULL,
    name text NOT NULL,
    description text,
    parent_department_id text,
    head_member_id text,
    business_unit text,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: entity_source_links; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.entity_source_links (
    link_id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    source_system text NOT NULL,
    source_object_type text NOT NULL,
    source_object_id text NOT NULL,
    source_display_name text,
    is_primary boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: identity_profile_serial; Type: SEQUENCE; Schema: greenhouse_core; Owner: -
--

CREATE SEQUENCE greenhouse_core.identity_profile_serial
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: identity_profile_source_links; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.identity_profile_source_links (
    link_id text NOT NULL,
    profile_id text NOT NULL,
    source_system text NOT NULL,
    source_object_type text NOT NULL,
    source_object_id text NOT NULL,
    source_user_id text,
    source_email text,
    source_display_name text,
    is_primary boolean DEFAULT false NOT NULL,
    is_login_identity boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: identity_profiles; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.identity_profiles (
    profile_id text NOT NULL,
    public_id text,
    profile_type text NOT NULL,
    canonical_email text,
    full_name text NOT NULL,
    job_title text,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    default_auth_mode text,
    primary_source_system text,
    primary_source_object_type text,
    primary_source_object_id text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    serial_number integer DEFAULT nextval('greenhouse_core.identity_profile_serial'::regclass)
);


--
-- Name: members; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.members (
    member_id text NOT NULL,
    public_id text,
    identity_profile_id text,
    department_id text,
    reports_to_member_id text,
    display_name text NOT NULL,
    primary_email text,
    phone text,
    job_level text,
    employment_type text,
    hire_date date,
    contract_end_date date,
    daily_required boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    first_name text,
    last_name text,
    preferred_name text,
    legal_name text,
    birth_date date,
    biography text,
    avatar_url text,
    role_title text,
    role_category text,
    org_role_id text,
    profession_id text,
    seniority_level text,
    location_city text,
    location_country text,
    time_zone text,
    email_aliases text[],
    contact_channel text,
    contact_handle text,
    relevance_note text,
    azure_oid text,
    notion_user_id text,
    notion_display_name text,
    hubspot_owner_id text,
    teams_user_id text,
    slack_user_id text,
    years_experience numeric(4,1),
    efeonce_start_date date,
    languages text[],
    assignable boolean DEFAULT true NOT NULL,
    prior_work_years numeric(10,2) DEFAULT 0 NOT NULL
);


--
-- Name: reporting_lines; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.reporting_lines (
    reporting_line_id text NOT NULL,
    member_id text NOT NULL,
    supervisor_member_id text,
    effective_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_to timestamp with time zone,
    source_system text DEFAULT 'greenhouse_manual'::text NOT NULL,
    source_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    change_reason text DEFAULT 'unspecified'::text NOT NULL,
    changed_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT reporting_lines_effective_window_check CHECK (((effective_to IS NULL) OR (effective_to > effective_from))),
    CONSTRAINT reporting_lines_no_self_reference_check CHECK (((supervisor_member_id IS NULL) OR (member_id <> supervisor_member_id)))
);


--
-- Name: operational_responsibilities; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.operational_responsibilities (
    responsibility_id text NOT NULL,
    member_id text NOT NULL,
    scope_type text NOT NULL,
    scope_id text NOT NULL,
    responsibility_type text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    effective_from timestamp with time zone DEFAULT now() NOT NULL,
    effective_to timestamp with time zone,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT operational_responsibilities_scope_type_check CHECK ((scope_type = ANY (ARRAY['organization'::text, 'space'::text, 'project'::text, 'department'::text, 'member'::text]))),
    CONSTRAINT operational_responsibilities_responsibility_type_check CHECK ((responsibility_type = ANY (ARRAY['account_lead'::text, 'delivery_lead'::text, 'finance_reviewer'::text, 'approval_delegate'::text, 'operations_lead'::text])))
);


--
-- Name: notion_workspace_source_bindings; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.notion_workspace_source_bindings (
    binding_id text NOT NULL,
    space_id text NOT NULL,
    source_system text NOT NULL,
    source_object_type text NOT NULL,
    source_object_id text NOT NULL,
    binding_role text NOT NULL,
    source_display_name text,
    is_primary boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notion_workspaces; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.notion_workspaces (
    space_id text NOT NULL,
    public_id text,
    client_id text,
    space_name text NOT NULL,
    space_type text DEFAULT 'client_space'::text NOT NULL,
    primary_project_database_source_id text,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT spaces_space_type_check CHECK ((space_type = ANY (ARRAY['client_space'::text, 'internal_space'::text])))
);


--
-- Name: organizations; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.organizations (
    organization_id text NOT NULL,
    public_id text,
    organization_name text NOT NULL,
    legal_name text,
    tax_id text,
    tax_id_type text,
    industry text,
    country text DEFAULT 'CL'::text,
    hubspot_company_id text,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    organization_type text DEFAULT 'other'::text,
    legal_address text,
    is_operating_entity boolean DEFAULT false NOT NULL,
    CONSTRAINT organizations_type_check CHECK ((organization_type = ANY (ARRAY['client'::text, 'supplier'::text, 'both'::text, 'other'::text])))
);


--
-- Name: person_memberships; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.person_memberships (
    membership_id text NOT NULL,
    public_id text,
    profile_id text NOT NULL,
    organization_id text,
    space_id text,
    membership_type text DEFAULT 'team_member'::text NOT NULL,
    role_label text,
    department text,
    start_date date,
    end_date date,
    is_primary boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT person_memberships_membership_type_check CHECK ((membership_type = ANY (ARRAY['team_member'::text, 'client_contact'::text, 'client_user'::text, 'contact'::text, 'billing'::text, 'contractor'::text, 'partner'::text, 'advisor'::text])))
);


--
-- Name: providers; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.providers (
    provider_id text NOT NULL,
    public_id text,
    provider_name text NOT NULL,
    legal_name text,
    provider_type text,
    website_url text,
    primary_email text,
    primary_contact_name text,
    country_code text,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: role_view_assignments; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.role_view_assignments (
    role_code text NOT NULL,
    view_code text NOT NULL,
    granted boolean DEFAULT true NOT NULL,
    granted_by text,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: roles; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.roles (
    role_code text NOT NULL,
    role_name text NOT NULL,
    role_family text,
    description text,
    tenant_type text,
    is_admin boolean DEFAULT false NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    route_group_scope text[] DEFAULT ARRAY[]::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: seq_membership_public_id; Type: SEQUENCE; Schema: greenhouse_core; Owner: -
--

CREATE SEQUENCE greenhouse_core.seq_membership_public_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_organization_public_id; Type: SEQUENCE; Schema: greenhouse_core; Owner: -
--

CREATE SEQUENCE greenhouse_core.seq_organization_public_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_service_public_id; Type: SEQUENCE; Schema: greenhouse_core; Owner: -
--

CREATE SEQUENCE greenhouse_core.seq_service_public_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_space_public_id; Type: SEQUENCE; Schema: greenhouse_core; Owner: -
--

CREATE SEQUENCE greenhouse_core.seq_space_public_id
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_history; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.service_history (
    history_id text NOT NULL,
    service_id text NOT NULL,
    field_changed text NOT NULL,
    old_value text,
    new_value text,
    changed_by text,
    changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: service_modules; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.service_modules (
    module_id text NOT NULL,
    module_code text NOT NULL,
    module_name text NOT NULL,
    business_line text,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    module_kind text,
    parent_module_code text
);


--
-- Name: services; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.services (
    service_id text NOT NULL,
    public_id text,
    hubspot_service_id text,
    name text NOT NULL,
    space_id text NOT NULL,
    organization_id text,
    hubspot_company_id text,
    hubspot_deal_id text,
    pipeline_stage text DEFAULT 'onboarding'::text NOT NULL,
    start_date date,
    target_end_date date,
    total_cost numeric(14,2),
    amount_paid numeric(14,2) DEFAULT 0,
    currency text DEFAULT 'CLP'::text NOT NULL,
    linea_de_servicio text NOT NULL,
    servicio_especifico text NOT NULL,
    modalidad text DEFAULT 'continua'::text,
    billing_frequency text DEFAULT 'monthly'::text,
    country text DEFAULT 'CL'::text,
    notion_project_id text,
    hubspot_last_synced_at timestamp with time zone,
    hubspot_sync_status text DEFAULT 'pending'::text,
    active boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_by text,
    updated_by text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT services_billing_frequency_check CHECK ((billing_frequency = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'project'::text]))),
    CONSTRAINT services_linea_de_servicio_check CHECK ((linea_de_servicio = ANY (ARRAY['globe'::text, 'efeonce_digital'::text, 'reach'::text, 'wave'::text, 'crm_solutions'::text]))),
    CONSTRAINT services_modalidad_check CHECK ((modalidad = ANY (ARRAY['continua'::text, 'sprint'::text, 'proyecto'::text]))),
    CONSTRAINT services_pipeline_stage_check CHECK ((pipeline_stage = ANY (ARRAY['onboarding'::text, 'active'::text, 'renewal_pending'::text, 'renewed'::text, 'closed'::text, 'paused'::text])))
);


--
-- Name: space_notion_sources; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.space_notion_sources (
    source_id text NOT NULL,
    space_id text NOT NULL,
    notion_db_proyectos character varying(32) NOT NULL,
    notion_db_tareas character varying(32) NOT NULL,
    notion_db_sprints character varying(32),
    notion_db_revisiones character varying(32),
    notion_workspace_id character varying(36),
    sync_enabled boolean DEFAULT true NOT NULL,
    sync_frequency character varying(20) DEFAULT 'daily'::character varying NOT NULL,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by character varying(100)
);


--
-- Name: spaces; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.spaces (
    space_id text NOT NULL,
    public_id text,
    organization_id text,
    client_id text,
    space_name text NOT NULL,
    space_type text DEFAULT 'client_space'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT spaces_space_type_check1 CHECK ((space_type = ANY (ARRAY['client_space'::text, 'internal_space'::text])))
);


--
-- Name: user_campaign_scopes; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.user_campaign_scopes (
    scope_id text NOT NULL,
    user_id text NOT NULL,
    campaign_id text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_client_scopes; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.user_client_scopes (
    scope_id text NOT NULL,
    user_id text NOT NULL,
    client_id text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_project_scopes; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.user_project_scopes (
    scope_id text NOT NULL,
    user_id text NOT NULL,
    project_id text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_role_assignments; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.user_role_assignments (
    assignment_id text NOT NULL,
    user_id text NOT NULL,
    role_code text NOT NULL,
    client_id text,
    scope_level text,
    project_id text,
    campaign_id text,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    effective_to timestamp with time zone,
    assigned_by_user_id text
);


--
-- Name: user_view_overrides; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.user_view_overrides (
    user_id text NOT NULL,
    view_code text NOT NULL,
    override_type text NOT NULL,
    reason text,
    expires_at timestamp with time zone,
    granted_by text NOT NULL,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_view_overrides_override_type_check CHECK ((override_type = ANY (ARRAY['grant'::text, 'revoke'::text])))
);


--
-- Name: v_client_active_modules; Type: VIEW; Schema: greenhouse_core; Owner: -
--

CREATE VIEW greenhouse_core.v_client_active_modules AS
 SELECT DISTINCT s.space_id,
    sp.client_id,
    sm.module_id,
    sm.module_code,
    sm.business_line
   FROM ((greenhouse_core.services s
     JOIN greenhouse_core.spaces sp ON ((sp.space_id = s.space_id)))
     JOIN greenhouse_core.service_modules sm ON (((sm.module_code = s.servicio_especifico) AND (sm.active = true))))
  WHERE ((s.active = true) AND (s.pipeline_stage = ANY (ARRAY['active'::text, 'renewal_pending'::text, 'renewed'::text])));


--
-- Name: view_access_log; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.view_access_log (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    action text NOT NULL,
    target_role text,
    target_user text,
    view_code text NOT NULL,
    performed_by text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT view_access_log_action_check CHECK ((action = ANY (ARRAY['grant_role'::text, 'revoke_role'::text, 'grant_user'::text, 'revoke_user'::text, 'expire_user'::text])))
);


--
-- Name: view_registry; Type: TABLE; Schema: greenhouse_core; Owner: -
--

CREATE TABLE greenhouse_core.view_registry (
    view_code text NOT NULL,
    section text NOT NULL,
    label text NOT NULL,
    description text,
    route_group text NOT NULL,
    route_path text NOT NULL,
    icon text,
    display_order integer DEFAULT 0 NOT NULL,
    parent_view_code text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: period_closure_config; Type: TABLE; Schema: greenhouse_cost_intelligence; Owner: -
--

CREATE TABLE greenhouse_cost_intelligence.period_closure_config (
    config_id text NOT NULL,
    require_payroll_exported boolean DEFAULT true NOT NULL,
    require_income_recorded boolean DEFAULT true NOT NULL,
    require_expenses_recorded boolean DEFAULT true NOT NULL,
    require_bank_reconciled boolean DEFAULT false NOT NULL,
    require_fx_locked boolean DEFAULT true NOT NULL,
    margin_alert_threshold_pct numeric(5,2) DEFAULT 15.00 NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: period_closures; Type: TABLE; Schema: greenhouse_cost_intelligence; Owner: -
--

CREATE TABLE greenhouse_cost_intelligence.period_closures (
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    closure_status text DEFAULT 'open'::text NOT NULL,
    payroll_status text DEFAULT 'pending'::text NOT NULL,
    income_status text DEFAULT 'pending'::text NOT NULL,
    expense_status text DEFAULT 'pending'::text NOT NULL,
    reconciliation_status text DEFAULT 'not_required'::text NOT NULL,
    fx_status text DEFAULT 'pending'::text NOT NULL,
    readiness_pct integer DEFAULT 0 NOT NULL,
    closed_at timestamp with time zone,
    closed_by text,
    reopened_at timestamp with time zone,
    reopened_by text,
    reopened_reason text,
    snapshot_revision integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT period_closures_closure_status_check CHECK ((closure_status = ANY (ARRAY['open'::text, 'ready'::text, 'closed'::text, 'reopened'::text]))),
    CONSTRAINT period_closures_expense_status_check CHECK ((expense_status = ANY (ARRAY['pending'::text, 'partial'::text, 'complete'::text]))),
    CONSTRAINT period_closures_fx_status_check CHECK ((fx_status = ANY (ARRAY['pending'::text, 'locked'::text]))),
    CONSTRAINT period_closures_income_status_check CHECK ((income_status = ANY (ARRAY['pending'::text, 'partial'::text, 'complete'::text]))),
    CONSTRAINT period_closures_payroll_status_check CHECK ((payroll_status = ANY (ARRAY['pending'::text, 'calculated'::text, 'approved'::text, 'exported'::text]))),
    CONSTRAINT period_closures_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT period_closures_readiness_pct_check CHECK (((readiness_pct >= 0) AND (readiness_pct <= 100))),
    CONSTRAINT period_closures_reconciliation_status_check CHECK ((reconciliation_status = ANY (ARRAY['pending'::text, 'partial'::text, 'complete'::text, 'not_required'::text])))
);


--
-- Name: companies; Type: TABLE; Schema: greenhouse_crm; Owner: -
--

CREATE TABLE greenhouse_crm.companies (
    company_record_id text NOT NULL,
    client_id text,
    hubspot_company_id text NOT NULL,
    company_name text NOT NULL,
    legal_name text,
    owner_user_id text,
    lifecycle_stage text,
    industry text,
    country_code text,
    website_url text,
    active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    source_updated_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sync_run_id text,
    payload_hash text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    owner_member_id text
);


--
-- Name: contacts; Type: TABLE; Schema: greenhouse_crm; Owner: -
--

CREATE TABLE greenhouse_crm.contacts (
    contact_record_id text NOT NULL,
    client_id text,
    company_record_id text,
    linked_user_id text,
    linked_identity_profile_id text,
    hubspot_contact_id text NOT NULL,
    hubspot_primary_company_id text,
    hubspot_associated_company_ids text[] DEFAULT ARRAY[]::text[] NOT NULL,
    email text,
    first_name text,
    last_name text,
    display_name text NOT NULL,
    job_title text,
    phone text,
    mobile_phone text,
    lifecycle_stage text,
    lead_status text,
    owner_user_id text,
    active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    source_updated_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sync_run_id text,
    payload_hash text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    owner_member_id text
);


--
-- Name: deals; Type: TABLE; Schema: greenhouse_crm; Owner: -
--

CREATE TABLE greenhouse_crm.deals (
    deal_record_id text NOT NULL,
    client_id text,
    company_record_id text,
    module_id text,
    hubspot_deal_id text NOT NULL,
    hubspot_company_id text,
    deal_name text NOT NULL,
    pipeline_id text,
    stage_id text,
    stage_name text,
    amount numeric(14,2),
    currency text,
    close_date date,
    owner_user_id text,
    is_closed_won boolean DEFAULT false NOT NULL,
    is_closed_lost boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    source_updated_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sync_run_id text,
    payload_hash text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    owner_member_id text
);


--
-- Name: projects; Type: TABLE; Schema: greenhouse_delivery; Owner: -
--

CREATE TABLE greenhouse_delivery.projects (
    project_record_id text NOT NULL,
    client_id text,
    module_id text,
    notion_project_id text NOT NULL,
    project_name text NOT NULL,
    project_status text,
    project_phase text,
    owner_member_id text,
    start_date date,
    end_date date,
    active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    source_updated_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sync_run_id text,
    payload_hash text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    project_database_source_id text,
    space_id text,
    project_summary text,
    page_url text,
    completion_label text,
    on_time_pct_source numeric(6,2),
    avg_rpa_source numeric(10,2)
);


--
-- Name: space_property_mappings; Type: TABLE; Schema: greenhouse_delivery; Owner: -
--

CREATE TABLE greenhouse_delivery.space_property_mappings (
    id text NOT NULL,
    space_id text NOT NULL,
    notion_property_name text NOT NULL,
    conformed_field_name text NOT NULL,
    notion_type text NOT NULL,
    target_type text NOT NULL,
    coercion_rule text DEFAULT 'direct'::text NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    fallback_value text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text
);


--
-- Name: sprints; Type: TABLE; Schema: greenhouse_delivery; Owner: -
--

CREATE TABLE greenhouse_delivery.sprints (
    sprint_record_id text NOT NULL,
    project_record_id text,
    notion_sprint_id text NOT NULL,
    sprint_name text NOT NULL,
    sprint_status text,
    start_date date,
    end_date date,
    is_deleted boolean DEFAULT false NOT NULL,
    source_updated_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sync_run_id text,
    payload_hash text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    project_database_source_id text,
    space_id text,
    page_url text,
    completed_tasks_count integer,
    total_tasks_count integer,
    completion_pct_source numeric(6,2)
);


--
-- Name: staff_aug_events; Type: TABLE; Schema: greenhouse_delivery; Owner: -
--

CREATE TABLE greenhouse_delivery.staff_aug_events (
    staff_aug_event_id text NOT NULL,
    placement_id text NOT NULL,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: staff_aug_onboarding_items; Type: TABLE; Schema: greenhouse_delivery; Owner: -
--

CREATE TABLE greenhouse_delivery.staff_aug_onboarding_items (
    onboarding_item_id text NOT NULL,
    placement_id text NOT NULL,
    item_key text NOT NULL,
    item_label text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    blocker_note text,
    verified_at timestamp with time zone,
    verified_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT staff_aug_onboarding_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'blocked'::text, 'in_progress'::text, 'done'::text])))
);


--
-- Name: staff_aug_placements; Type: TABLE; Schema: greenhouse_delivery; Owner: -
--

CREATE TABLE greenhouse_delivery.staff_aug_placements (
    placement_id text NOT NULL,
    public_id text,
    assignment_id text NOT NULL,
    client_id text NOT NULL,
    space_id text,
    organization_id text,
    member_id text NOT NULL,
    provider_id text,
    service_module_assignment_id text,
    business_unit text NOT NULL,
    status text DEFAULT 'pipeline'::text NOT NULL,
    lifecycle_stage text DEFAULT 'draft'::text NOT NULL,
    provider_relationship_type text DEFAULT 'direct'::text NOT NULL,
    pay_regime_snapshot text,
    contract_type_snapshot text,
    compensation_version_id_snapshot text,
    cost_rate_amount numeric(14,2),
    cost_rate_currency text,
    cost_rate_source text DEFAULT 'payroll_snapshot'::text NOT NULL,
    billing_rate_amount numeric(14,2),
    billing_rate_currency text DEFAULT 'USD'::text NOT NULL,
    billing_frequency text DEFAULT 'monthly'::text NOT NULL,
    external_contract_ref text,
    legal_entity text,
    contractor_country text,
    client_reporting_to text,
    client_communication_channel text,
    client_tools text[] DEFAULT ARRAY[]::text[] NOT NULL,
    required_skills text[] DEFAULT ARRAY[]::text[] NOT NULL,
    matched_skills text[] DEFAULT ARRAY[]::text[] NOT NULL,
    placement_notes text,
    contract_start_date date,
    contract_end_date date,
    actual_end_date date,
    renewal_alert_days integer DEFAULT 60 NOT NULL,
    sla_availability_percent numeric(5,2),
    sla_response_hours integer,
    sla_notice_period_days integer DEFAULT 30 NOT NULL,
    latest_snapshot_id text,
    created_by_user_id text,
    updated_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT staff_aug_placements_billing_frequency_check CHECK ((billing_frequency = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'annual'::text]))),
    CONSTRAINT staff_aug_placements_cost_rate_source_check CHECK ((cost_rate_source = ANY (ARRAY['payroll_snapshot'::text, 'manual'::text]))),
    CONSTRAINT staff_aug_placements_lifecycle_stage_check CHECK ((lifecycle_stage = ANY (ARRAY['draft'::text, 'contracting'::text, 'client_setup'::text, 'live'::text, 'closed'::text]))),
    CONSTRAINT staff_aug_placements_provider_relationship_type_check CHECK ((provider_relationship_type = ANY (ARRAY['direct'::text, 'eor'::text, 'staffing_partner'::text, 'other'::text]))),
    CONSTRAINT staff_aug_placements_status_check CHECK ((status = ANY (ARRAY['pipeline'::text, 'onboarding'::text, 'active'::text, 'renewal_pending'::text, 'renewed'::text, 'ended'::text])))
);


--
-- Name: tasks; Type: TABLE; Schema: greenhouse_delivery; Owner: -
--

CREATE TABLE greenhouse_delivery.tasks (
    task_record_id text NOT NULL,
    project_record_id text,
    sprint_record_id text,
    client_id text,
    module_id text,
    assignee_member_id text,
    notion_task_id text NOT NULL,
    notion_project_id text,
    notion_sprint_id text,
    task_name text NOT NULL,
    task_status text,
    task_phase text,
    task_priority text,
    due_date date,
    completed_at timestamp with time zone,
    estimated_hours numeric(10,2),
    is_deleted boolean DEFAULT false NOT NULL,
    source_updated_at timestamp with time zone,
    synced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sync_run_id text,
    payload_hash text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    project_database_source_id text,
    space_id text,
    delivery_compliance text,
    days_late integer,
    is_rescheduled boolean DEFAULT false NOT NULL,
    performance_indicator_label text,
    performance_indicator_code text,
    client_change_round_final integer,
    rpa_value numeric(10,2),
    frame_versions integer,
    frame_comments integer,
    open_frame_comments integer,
    client_review_open boolean DEFAULT false NOT NULL,
    workflow_review_open boolean DEFAULT false NOT NULL,
    blocker_count integer,
    last_frame_comment text,
    page_url text,
    completion_label text,
    rescheduled_days integer,
    client_change_round_label text,
    rpa_semaphore_source text,
    original_due_date date,
    execution_time_label text,
    changes_time_label text,
    review_time_label text,
    workflow_change_round integer
);


--
-- Name: accounts; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.accounts (
    account_id text NOT NULL,
    account_name text NOT NULL,
    bank_name text NOT NULL,
    account_number text,
    account_number_full text,
    currency text NOT NULL,
    account_type text NOT NULL,
    country_code text DEFAULT 'CL'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    opening_balance numeric DEFAULT 0 NOT NULL,
    opening_balance_date date,
    notes text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: bank_statement_rows; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.bank_statement_rows (
    row_id text NOT NULL,
    period_id text NOT NULL,
    transaction_date date NOT NULL,
    value_date date,
    description text NOT NULL,
    reference text,
    amount numeric(14,2) NOT NULL,
    balance numeric(14,2),
    match_status text DEFAULT 'unmatched'::text NOT NULL,
    matched_type text,
    matched_id text,
    matched_payment_id text,
    match_confidence numeric(5,2),
    notes text,
    matched_by_user_id text,
    matched_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT bank_statement_rows_match_status_check CHECK ((match_status = ANY (ARRAY['unmatched'::text, 'matched'::text, 'excluded'::text])))
);


--
-- Name: client_economics; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.client_economics (
    snapshot_id text NOT NULL,
    client_id text NOT NULL,
    client_name text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    total_revenue_clp numeric(14,2) DEFAULT 0,
    direct_costs_clp numeric(14,2) DEFAULT 0,
    indirect_costs_clp numeric(14,2) DEFAULT 0,
    gross_margin_clp numeric(14,2) DEFAULT 0,
    gross_margin_percent numeric(6,4),
    net_margin_clp numeric(14,2) DEFAULT 0,
    net_margin_percent numeric(6,4),
    headcount_fte numeric(6,2),
    revenue_per_fte numeric(14,2),
    cost_per_fte numeric(14,2),
    notes text,
    computed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT client_economics_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12)))
);


--
-- Name: client_profiles; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.client_profiles (
    client_profile_id text NOT NULL,
    client_id text,
    hubspot_company_id text,
    tax_id text,
    tax_id_type text,
    legal_name text,
    billing_address text,
    billing_country text,
    payment_terms_days integer DEFAULT 30,
    payment_currency text DEFAULT 'CLP'::text,
    requires_po boolean DEFAULT false NOT NULL,
    requires_hes boolean DEFAULT false NOT NULL,
    current_po_number text,
    current_hes_number text,
    finance_contacts jsonb,
    special_conditions text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    organization_id text
);


--
-- Name: cost_allocations; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.cost_allocations (
    allocation_id text NOT NULL,
    expense_id text NOT NULL,
    client_id text NOT NULL,
    client_name text NOT NULL,
    allocation_percent numeric(6,4) NOT NULL,
    allocated_amount_clp numeric(14,2) NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    allocation_method text DEFAULT 'manual'::text NOT NULL,
    notes text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cost_allocations_allocation_percent_check CHECK (((allocation_percent > (0)::numeric) AND (allocation_percent <= (1)::numeric))),
    CONSTRAINT cost_allocations_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12)))
);


--
-- Name: economic_indicators; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.economic_indicators (
    indicator_id text NOT NULL,
    indicator_code text NOT NULL,
    indicator_date date NOT NULL,
    value numeric NOT NULL,
    source text,
    unit text,
    frequency text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: exchange_rates; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.exchange_rates (
    rate_id text NOT NULL,
    from_currency text NOT NULL,
    to_currency text NOT NULL,
    rate numeric NOT NULL,
    rate_date date NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.expenses (
    expense_id text NOT NULL,
    client_id text,
    expense_type text NOT NULL,
    description text NOT NULL,
    currency text NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    tax_rate numeric(6,4),
    tax_amount numeric(14,2),
    total_amount numeric(14,2) NOT NULL,
    exchange_rate_to_clp numeric(14,6),
    total_amount_clp numeric(14,2) NOT NULL,
    payment_date date,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    payment_method text,
    payment_account_id text,
    payment_reference text,
    document_number text,
    document_date date,
    due_date date,
    supplier_id text,
    supplier_name text,
    supplier_invoice_number text,
    payroll_period_id text,
    payroll_entry_id text,
    member_id text,
    member_name text,
    social_security_type text,
    social_security_institution text,
    social_security_period text,
    tax_type text,
    tax_period text,
    tax_form_number text,
    miscellaneous_category text,
    service_line text,
    is_recurring boolean DEFAULT false NOT NULL,
    recurrence_frequency text,
    is_reconciled boolean DEFAULT false NOT NULL,
    reconciliation_id text,
    linked_income_id text,
    notes text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cost_category text DEFAULT 'operational'::text,
    cost_is_direct boolean DEFAULT false,
    allocated_client_id text,
    nubox_purchase_id bigint,
    nubox_document_status text,
    nubox_supplier_rut text,
    nubox_supplier_name text,
    nubox_origin text,
    nubox_last_synced_at timestamp with time zone,
    direct_overhead_scope text DEFAULT 'none'::text,
    direct_overhead_kind text,
    direct_overhead_member_id text,
    is_annulled boolean DEFAULT false,
    sii_document_status text,
    receipt_date date,
    purchase_type text,
    balance_nubox numeric,
    vat_unrecoverable_amount numeric,
    vat_fixed_assets_amount numeric,
    vat_common_use_amount numeric,
    nubox_pdf_url text,
    dte_type_code text,
    dte_folio text,
    exempt_amount numeric,
    other_taxes_amount numeric,
    withholding_amount numeric,
    period_year integer,
    period_month integer,
    space_id text,
    source_type text,
    payment_provider text,
    payment_rail text,
    CONSTRAINT expenses_currency_check CHECK ((currency = ANY (ARRAY['CLP'::text, 'USD'::text]))),
    CONSTRAINT expenses_direct_overhead_kind_check CHECK ((direct_overhead_kind = ANY (ARRAY['tool_license'::text, 'tool_usage'::text, 'equipment'::text, 'reimbursement'::text, 'other'::text]))),
    CONSTRAINT expenses_direct_overhead_scope_check CHECK ((direct_overhead_scope = ANY (ARRAY['none'::text, 'member_direct'::text, 'shared'::text]))),
    CONSTRAINT expenses_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'written_off'::text])))
);


--
-- Name: factoring_operations; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.factoring_operations (
    operation_id text NOT NULL,
    income_id text NOT NULL,
    factoring_provider_id text NOT NULL,
    nominal_amount numeric(14,2) NOT NULL,
    advance_amount numeric(14,2) NOT NULL,
    fee_amount numeric(14,2) NOT NULL,
    fee_rate numeric(6,4) NOT NULL,
    operation_date date NOT NULL,
    settlement_date date,
    status text DEFAULT 'active'::text NOT NULL,
    linked_expense_id text,
    linked_payment_id text,
    notes text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT factoring_operations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'settled'::text, 'defaulted'::text])))
);


--
-- Name: income; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.income (
    income_id text NOT NULL,
    client_id text,
    client_profile_id text,
    hubspot_company_id text,
    hubspot_deal_id text,
    client_name text NOT NULL,
    invoice_number text,
    invoice_date date NOT NULL,
    due_date date,
    description text,
    currency text NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    tax_rate numeric(6,4),
    tax_amount numeric(14,2) DEFAULT 0 NOT NULL,
    total_amount numeric(14,2) NOT NULL,
    exchange_rate_to_clp numeric(14,6),
    total_amount_clp numeric(14,2) NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    amount_paid numeric(14,2) DEFAULT 0 NOT NULL,
    collection_method text DEFAULT 'direct'::text,
    po_number text,
    hes_number text,
    service_line text,
    income_type text DEFAULT 'service_fee'::text,
    is_reconciled boolean DEFAULT false NOT NULL,
    reconciliation_id text,
    notes text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    partner_id text,
    partner_name text,
    partner_share_percent numeric(6,4),
    partner_share_amount numeric(14,2),
    net_after_partner numeric(14,2),
    nubox_document_id bigint,
    nubox_sii_track_id bigint,
    nubox_emission_status text,
    dte_type_code text,
    dte_folio text,
    nubox_emitted_at timestamp with time zone,
    nubox_last_synced_at timestamp with time zone,
    organization_id text,
    referenced_income_id text,
    is_annulled boolean DEFAULT false,
    dte_type_abbreviation text,
    dte_type_name text,
    exempt_amount numeric,
    other_taxes_amount numeric,
    withholding_amount numeric,
    balance_nubox numeric,
    payment_form text,
    payment_form_name text,
    origin text,
    period_year integer,
    period_month integer,
    nubox_pdf_url text,
    nubox_xml_url text,
    nubox_details_url text,
    nubox_references_url text,
    client_main_activity text,
    purchase_order_id text,
    hes_id text,
    CONSTRAINT income_collection_method_check CHECK ((collection_method = ANY (ARRAY['direct'::text, 'factored'::text, 'mixed'::text]))),
    CONSTRAINT income_currency_check CHECK ((currency = ANY (ARRAY['CLP'::text, 'USD'::text]))),
    CONSTRAINT income_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'written_off'::text])))
);


--
-- Name: income_line_items; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.income_line_items (
    line_item_id text NOT NULL,
    income_id text NOT NULL,
    line_number integer NOT NULL,
    description text,
    quantity numeric,
    unit_price numeric,
    total_amount numeric,
    discount_percent numeric,
    is_exempt boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: income_payments; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.income_payments (
    payment_id text NOT NULL,
    income_id text NOT NULL,
    payment_date date,
    amount numeric(14,2) NOT NULL,
    currency text,
    reference text,
    payment_method text,
    payment_account_id text,
    payment_source text DEFAULT 'client_direct'::text NOT NULL,
    notes text,
    recorded_by_user_id text,
    recorded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_reconciled boolean DEFAULT false NOT NULL,
    reconciliation_row_id text,
    reconciled_at timestamp with time zone,
    reconciled_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT income_payments_payment_source_check CHECK ((payment_source = ANY (ARRAY['client_direct'::text, 'factoring_proceeds'::text])))
);


--
-- Name: expense_payments; Type: TABLE; Schema: greenhouse_finance; Owner: -
-- TASK-280: Symmetric to income_payments. Each row is an individual payment against a purchase document.
--

CREATE TABLE greenhouse_finance.expense_payments (
    payment_id text NOT NULL,
    expense_id text NOT NULL,
    payment_date date NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'CLP'::text NOT NULL,
    reference text,
    payment_method text,
    payment_account_id text,
    payment_source text DEFAULT 'manual'::text NOT NULL,
    notes text,
    recorded_by_user_id text,
    recorded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_reconciled boolean DEFAULT false NOT NULL,
    reconciliation_row_id text,
    reconciled_at timestamp with time zone,
    reconciled_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT expense_payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT expense_payments_payment_source_check CHECK ((payment_source = ANY (ARRAY['manual'::text, 'payroll_system'::text, 'nubox_sync'::text, 'bank_statement'::text])))
);


--
-- Name: nubox_emission_log; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.nubox_emission_log (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    income_id text NOT NULL,
    idempotence_id uuid NOT NULL,
    request_payload jsonb NOT NULL,
    response_status integer,
    response_body jsonb,
    nubox_document_id bigint,
    emission_status text,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: purchase_orders; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.purchase_orders (
    po_id text NOT NULL,
    po_number text NOT NULL,
    client_id text NOT NULL,
    organization_id text,
    space_id text,
    authorized_amount numeric NOT NULL,
    currency text DEFAULT 'CLP'::text NOT NULL,
    exchange_rate_to_clp numeric DEFAULT 1,
    authorized_amount_clp numeric NOT NULL,
    invoiced_amount_clp numeric DEFAULT 0,
    remaining_amount_clp numeric,
    invoice_count integer DEFAULT 0,
    status text DEFAULT 'active'::text NOT NULL,
    issue_date date NOT NULL,
    expiry_date date,
    received_at timestamp with time zone DEFAULT now(),
    description text,
    service_scope text,
    contact_name text,
    contact_email text,
    notes text,
    attachment_url text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    attachment_asset_id text
);


--
-- Name: quotes; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.quotes (
    quote_id text NOT NULL,
    client_id text,
    organization_id text,
    client_name text,
    quote_number text,
    quote_date date,
    due_date date,
    description text,
    currency text DEFAULT 'CLP'::text NOT NULL,
    subtotal numeric,
    tax_rate numeric DEFAULT 0.19,
    tax_amount numeric,
    total_amount numeric,
    exchange_rate_to_clp numeric DEFAULT 1,
    total_amount_clp numeric,
    status text DEFAULT 'sent'::text,
    converted_to_income_id text,
    expiry_date date,
    nubox_document_id text,
    nubox_sii_track_id text,
    nubox_emission_status text,
    dte_type_code text DEFAULT '52'::text,
    dte_folio text,
    nubox_emitted_at timestamp with time zone,
    nubox_last_synced_at timestamp with time zone,
    notes text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reconciliation_periods; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.reconciliation_periods (
    period_id text NOT NULL,
    account_id text NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    opening_balance numeric(14,2) NOT NULL,
    closing_balance_bank numeric(14,2),
    closing_balance_system numeric(14,2),
    difference numeric(14,2),
    status text DEFAULT 'draft'::text NOT NULL,
    statement_imported boolean DEFAULT false NOT NULL,
    statement_imported_at timestamp with time zone,
    statement_row_count integer,
    reconciled_by_user_id text,
    reconciled_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT reconciliation_periods_month_check CHECK (((month >= 1) AND (month <= 12))),
    CONSTRAINT reconciliation_periods_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'open'::text, 'in_progress'::text, 'reconciled'::text, 'closed'::text])))
);


--
-- Name: service_entry_sheets; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.service_entry_sheets (
    hes_id text NOT NULL,
    hes_number text NOT NULL,
    purchase_order_id text,
    client_id text NOT NULL,
    organization_id text,
    space_id text,
    service_description text NOT NULL,
    service_period_start date,
    service_period_end date,
    deliverables_summary text,
    amount numeric NOT NULL,
    currency text DEFAULT 'CLP'::text NOT NULL,
    amount_clp numeric NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    approved_by text,
    rejection_reason text,
    income_id text,
    invoiced boolean DEFAULT false,
    client_contact_name text,
    client_contact_email text,
    attachment_url text,
    notes text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: suppliers; Type: TABLE; Schema: greenhouse_finance; Owner: -
--

CREATE TABLE greenhouse_finance.suppliers (
    supplier_id text NOT NULL,
    provider_id text,
    legal_name text NOT NULL,
    trade_name text,
    tax_id text,
    tax_id_type text,
    country_code text DEFAULT 'CL'::text NOT NULL,
    category text NOT NULL,
    service_type text,
    is_international boolean DEFAULT false NOT NULL,
    primary_contact_name text,
    primary_contact_email text,
    primary_contact_phone text,
    website_url text,
    bank_name text,
    bank_account_number text,
    bank_account_type text,
    bank_routing text,
    payment_currency text DEFAULT 'CLP'::text NOT NULL,
    default_payment_terms integer DEFAULT 30 NOT NULL,
    default_payment_method text,
    requires_po boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    organization_id text
);


--
-- Name: leave_balances; Type: TABLE; Schema: greenhouse_hr; Owner: -
--

CREATE TABLE greenhouse_hr.leave_balances (
    balance_id text NOT NULL,
    member_id text NOT NULL,
    leave_type_code text NOT NULL,
    year integer NOT NULL,
    allowance_days numeric(10,2) DEFAULT 0 NOT NULL,
    carried_over_days numeric(10,2) DEFAULT 0 NOT NULL,
    used_days numeric(10,2) DEFAULT 0 NOT NULL,
    reserved_days numeric(10,2) DEFAULT 0 NOT NULL,
    updated_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    progressive_extra_days numeric(10,2) DEFAULT 0 NOT NULL,
    adjustment_days numeric(10,2) DEFAULT 0 NOT NULL,
    accumulated_periods numeric(10,2) DEFAULT 0 NOT NULL
);


--
-- Name: leave_policies; Type: TABLE; Schema: greenhouse_hr; Owner: -
--

CREATE TABLE greenhouse_hr.leave_policies (
    policy_id text NOT NULL,
    leave_type_code text NOT NULL,
    policy_name text NOT NULL,
    accrual_type text DEFAULT 'annual_fixed'::text NOT NULL,
    annual_days numeric(10,2) DEFAULT 0 NOT NULL,
    max_carry_over_days numeric(10,2) DEFAULT 0 NOT NULL,
    requires_approval boolean DEFAULT true NOT NULL,
    min_advance_days integer DEFAULT 0 NOT NULL,
    max_consecutive_days numeric(10,2),
    min_continuous_days numeric(10,2),
    max_accumulation_periods numeric(10,2),
    progressive_enabled boolean DEFAULT false NOT NULL,
    progressive_base_years integer DEFAULT 10 NOT NULL,
    progressive_interval_years integer DEFAULT 3 NOT NULL,
    progressive_max_extra_days integer DEFAULT 10 NOT NULL,
    applicable_employment_types text[] DEFAULT '{}'::text[] NOT NULL,
    applicable_pay_regimes text[] DEFAULT '{}'::text[] NOT NULL,
    allow_negative_balance boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT leave_policies_accrual_type_check CHECK ((accrual_type = ANY (ARRAY['annual_fixed'::text, 'monthly_accrual'::text, 'unlimited'::text, 'custom'::text])))
);


--
-- Name: leave_request_actions; Type: TABLE; Schema: greenhouse_hr; Owner: -
--

CREATE TABLE greenhouse_hr.leave_request_actions (
    action_id text NOT NULL,
    request_id text NOT NULL,
    action text NOT NULL,
    actor_user_id text,
    actor_member_id text,
    actor_name text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT leave_request_actions_action_check CHECK ((action = ANY (ARRAY['submit'::text, 'approve'::text, 'reject'::text, 'cancel'::text])))
);


--
-- Name: leave_requests; Type: TABLE; Schema: greenhouse_hr; Owner: -
--

CREATE TABLE greenhouse_hr.leave_requests (
    request_id text NOT NULL,
    member_id text NOT NULL,
    leave_type_code text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    requested_days numeric(10,2) NOT NULL,
    status text NOT NULL,
    reason text,
    attachment_url text,
    supervisor_member_id text,
    hr_reviewer_user_id text,
    decided_at timestamp with time zone,
    decided_by text,
    notes text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    attachment_asset_id text,
    CONSTRAINT leave_requests_status_check CHECK ((status = ANY (ARRAY['pending_supervisor'::text, 'pending_hr'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])))
);


--
-- Name: workflow_approval_snapshots; Type: TABLE; Schema: greenhouse_hr; Owner: -
--

CREATE TABLE greenhouse_hr.workflow_approval_snapshots (
    snapshot_id text NOT NULL,
    workflow_domain text NOT NULL,
    workflow_entity_id text NOT NULL,
    stage_code text NOT NULL,
    subject_member_id text NOT NULL,
    authority_source text NOT NULL,
    formal_approver_member_id text,
    formal_approver_name text,
    effective_approver_member_id text,
    effective_approver_name text,
    delegate_member_id text,
    delegate_member_name text,
    delegate_responsibility_id text,
    fallback_role_codes text[] DEFAULT '{}'::text[] NOT NULL,
    override_actor_user_id text,
    override_reason text,
    snapshot_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT workflow_approval_snapshots_authority_source_check CHECK ((authority_source = ANY (ARRAY['reporting_hierarchy'::text, 'delegation'::text, 'domain_fallback'::text, 'admin_override'::text]))),
    CONSTRAINT workflow_approval_snapshots_stage_code_check CHECK ((stage_code = ANY (ARRAY['supervisor_review'::text, 'hr_review'::text, 'finance_review'::text]))),
    CONSTRAINT workflow_approval_snapshots_workflow_domain_check CHECK ((workflow_domain = ANY (ARRAY['leave'::text, 'expense_report'::text, 'onboarding'::text, 'offboarding'::text, 'performance_evaluation'::text])))
);


--
-- Name: leave_types; Type: TABLE; Schema: greenhouse_hr; Owner: -
--

CREATE TABLE greenhouse_hr.leave_types (
    leave_type_code text NOT NULL,
    leave_type_name text NOT NULL,
    description text,
    default_annual_allowance_days numeric(10,2) DEFAULT 0 NOT NULL,
    requires_attachment boolean DEFAULT false NOT NULL,
    is_paid boolean DEFAULT true NOT NULL,
    color_token text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: email_deliveries; Type: TABLE; Schema: greenhouse_notifications; Owner: -
--

CREATE TABLE greenhouse_notifications.email_deliveries (
    delivery_id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    email_type text NOT NULL,
    domain text NOT NULL,
    recipient_email text NOT NULL,
    recipient_name text,
    recipient_user_id text,
    subject text NOT NULL,
    resend_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    has_attachments boolean DEFAULT false NOT NULL,
    delivery_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_event_id text,
    source_entity text,
    actor_email text,
    error_message text,
    attempt_number integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped'::text])))
);


--
-- Name: email_subscriptions; Type: TABLE; Schema: greenhouse_notifications; Owner: -
--

CREATE TABLE greenhouse_notifications.email_subscriptions (
    subscription_id uuid DEFAULT gen_random_uuid() NOT NULL,
    email_type text NOT NULL,
    recipient_email text NOT NULL,
    recipient_name text,
    recipient_user_id text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_log; Type: TABLE; Schema: greenhouse_notifications; Owner: -
--

CREATE TABLE greenhouse_notifications.notification_log (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid,
    user_id text NOT NULL,
    category text NOT NULL,
    channel text NOT NULL,
    status text NOT NULL,
    skip_reason text,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT notification_log_channel_check CHECK ((channel = ANY (ARRAY['in_app'::text, 'email'::text]))),
    CONSTRAINT notification_log_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'skipped'::text, 'failed'::text])))
);


--
-- Name: notification_preferences; Type: TABLE; Schema: greenhouse_notifications; Owner: -
--

CREATE TABLE greenhouse_notifications.notification_preferences (
    preference_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    category text NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    muted_until timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: greenhouse_notifications; Owner: -
--

CREATE TABLE greenhouse_notifications.notifications (
    notification_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    space_id text,
    category text NOT NULL,
    title text NOT NULL,
    body text,
    action_url text,
    icon text,
    metadata jsonb DEFAULT '{}'::jsonb,
    read_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'unread'::text,
    channel text DEFAULT 'in_app'::text
);


--
-- Name: attendance_monthly_snapshot; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.attendance_monthly_snapshot (
    member_id text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    working_days integer DEFAULT 0 NOT NULL,
    days_present integer DEFAULT 0 NOT NULL,
    days_absent integer DEFAULT 0 NOT NULL,
    days_on_leave integer DEFAULT 0 NOT NULL,
    days_on_unpaid_leave integer DEFAULT 0 NOT NULL,
    days_holiday integer DEFAULT 0 NOT NULL,
    source text DEFAULT 'hybrid'::text NOT NULL,
    snapshot_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chile_afp_rates; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.chile_afp_rates (
    afp_rate_id text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    afp_name text NOT NULL,
    total_rate numeric(6,4) NOT NULL,
    source text,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chile_afp_rates_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12)))
);


--
-- Name: chile_previred_indicators; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.chile_previred_indicators (
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    imm_clp numeric(14,2),
    sis_rate numeric(6,4),
    tope_afp_uf numeric(10,4),
    tope_cesantia_uf numeric(10,4),
    source text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chile_previred_indicators_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12)))
);


--
-- Name: chile_tax_brackets; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.chile_tax_brackets (
    bracket_id text NOT NULL,
    tax_table_version text NOT NULL,
    bracket_order integer NOT NULL,
    from_utm numeric(10,4) NOT NULL,
    to_utm numeric(10,4),
    rate numeric(6,4) NOT NULL,
    deduction_utm numeric(10,4) DEFAULT 0 NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: compensation_versions; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.compensation_versions (
    version_id text NOT NULL,
    member_id text NOT NULL,
    version integer NOT NULL,
    pay_regime text NOT NULL,
    currency text NOT NULL,
    base_salary numeric(14,2) NOT NULL,
    remote_allowance numeric(14,2) DEFAULT 0 NOT NULL,
    bonus_otd_min numeric(14,2) DEFAULT 0 NOT NULL,
    bonus_otd_max numeric(14,2) DEFAULT 0 NOT NULL,
    bonus_rpa_min numeric(14,2) DEFAULT 0 NOT NULL,
    bonus_rpa_max numeric(14,2) DEFAULT 0 NOT NULL,
    afp_name text,
    afp_rate numeric(6,4),
    health_system text,
    health_plan_uf numeric(10,4),
    unemployment_rate numeric(6,4),
    contract_type text DEFAULT 'indefinido'::text NOT NULL,
    has_apv boolean DEFAULT false NOT NULL,
    apv_amount numeric(14,2) DEFAULT 0 NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    is_current boolean DEFAULT false NOT NULL,
    change_reason text,
    created_by_user_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fixed_bonus_label text,
    fixed_bonus_amount numeric(14,2) DEFAULT 0 NOT NULL,
    gratificacion_legal_mode text DEFAULT 'ninguna'::text NOT NULL,
    colacion_amount numeric(14,2) DEFAULT 0 NOT NULL,
    movilizacion_amount numeric(14,2) DEFAULT 0 NOT NULL,
    afp_cotizacion_rate numeric(6,4),
    afp_comision_rate numeric(6,4),
    desired_net_clp numeric(14,2),
    CONSTRAINT compensation_versions_contract_type_check CHECK ((contract_type = ANY (ARRAY['indefinido'::text, 'plazo_fijo'::text]))),
    CONSTRAINT compensation_versions_currency_check CHECK ((currency = ANY (ARRAY['CLP'::text, 'USD'::text]))),
    CONSTRAINT compensation_versions_health_system_check CHECK (((health_system IS NULL) OR (health_system = ANY (ARRAY['fonasa'::text, 'isapre'::text])))),
    CONSTRAINT compensation_versions_pay_regime_check CHECK ((pay_regime = ANY (ARRAY['chile'::text, 'international'::text])))
);


--
-- Name: payroll_bonus_config; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.payroll_bonus_config (
    config_id text NOT NULL,
    otd_threshold numeric(6,2) NOT NULL,
    rpa_threshold numeric(6,2) NOT NULL,
    effective_from date NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    otd_floor numeric(6,2) DEFAULT 70 NOT NULL,
    rpa_full_payout_threshold numeric(6,2) DEFAULT 1.70 NOT NULL,
    rpa_soft_band_end numeric(6,2) DEFAULT 2.00 NOT NULL,
    rpa_soft_band_floor_factor numeric(6,4) DEFAULT 0.8000 NOT NULL
);


--
-- Name: payroll_entries; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.payroll_entries (
    entry_id text NOT NULL,
    period_id text NOT NULL,
    member_id text NOT NULL,
    compensation_version_id text NOT NULL,
    pay_regime text NOT NULL,
    currency text NOT NULL,
    base_salary numeric(14,2) NOT NULL,
    remote_allowance numeric(14,2) DEFAULT 0 NOT NULL,
    member_display_name text,
    kpi_otd_percent numeric(6,2),
    kpi_rpa_avg numeric(6,2),
    kpi_otd_qualifies boolean,
    kpi_rpa_qualifies boolean,
    kpi_tasks_completed integer,
    kpi_data_source text DEFAULT 'notion_ops'::text,
    bonus_otd_amount numeric(14,2) DEFAULT 0 NOT NULL,
    bonus_rpa_amount numeric(14,2) DEFAULT 0 NOT NULL,
    bonus_other_amount numeric(14,2) DEFAULT 0 NOT NULL,
    bonus_other_description text,
    gross_total numeric(14,2) NOT NULL,
    chile_afp_name text,
    chile_afp_rate numeric(6,4),
    chile_afp_amount numeric(14,2),
    chile_health_system text,
    chile_health_amount numeric(14,2),
    chile_unemployment_rate numeric(6,4),
    chile_unemployment_amount numeric(14,2),
    chile_taxable_base numeric(14,2),
    chile_tax_amount numeric(14,2),
    chile_apv_amount numeric(14,2),
    chile_uf_value numeric(10,2),
    chile_total_deductions numeric(14,2),
    net_total_calculated numeric(14,2),
    net_total_override numeric(14,2),
    net_total numeric(14,2) NOT NULL,
    manual_override boolean DEFAULT false NOT NULL,
    manual_override_note text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    bonus_otd_proration_factor numeric(6,4),
    bonus_rpa_proration_factor numeric(6,4),
    working_days_in_period integer,
    days_present integer,
    days_absent integer,
    days_on_leave integer,
    days_on_unpaid_leave integer,
    adjusted_base_salary numeric(14,2),
    adjusted_remote_allowance numeric(14,2),
    chile_gratificacion_legal numeric(14,2),
    chile_colacion_amount numeric(14,2),
    chile_movilizacion_amount numeric(14,2),
    adjusted_colacion_amount numeric(14,2),
    adjusted_movilizacion_amount numeric(14,2),
    colacion_amount numeric(14,2) DEFAULT 0 NOT NULL,
    movilizacion_amount numeric(14,2) DEFAULT 0 NOT NULL,
    chile_afp_cotizacion_amount numeric(14,2),
    chile_afp_comision_amount numeric(14,2),
    fixed_bonus_label text,
    fixed_bonus_amount numeric(14,2) DEFAULT 0 NOT NULL,
    adjusted_fixed_bonus_amount numeric(14,2),
    chile_health_obligatoria_amount numeric(14,2),
    chile_health_voluntaria_amount numeric(14,2),
    chile_employer_sis_amount numeric(14,2),
    chile_employer_cesantia_amount numeric(14,2),
    chile_employer_mutual_amount numeric(14,2),
    chile_employer_total_cost numeric(14,2),
    CONSTRAINT payroll_entries_currency_check CHECK ((currency = ANY (ARRAY['CLP'::text, 'USD'::text]))),
    CONSTRAINT payroll_entries_pay_regime_check CHECK ((pay_regime = ANY (ARRAY['chile'::text, 'international'::text])))
);


--
-- Name: payroll_export_packages; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.payroll_export_packages (
    period_id text NOT NULL,
    storage_bucket text,
    pdf_storage_path text,
    csv_storage_path text,
    pdf_file_size_bytes integer,
    csv_file_size_bytes integer,
    pdf_template_version text,
    csv_template_version text,
    generated_at timestamp with time zone,
    generated_by text,
    delivery_status text DEFAULT 'pending'::text NOT NULL,
    delivery_attempts integer DEFAULT 0 NOT NULL,
    last_sent_at timestamp with time zone,
    last_sent_by text,
    last_email_delivery_id text,
    last_send_error text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pdf_asset_id text,
    csv_asset_id text,
    CONSTRAINT payroll_export_packages_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])))
);


--
-- Name: payroll_periods; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.payroll_periods (
    period_id text NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    calculated_at timestamp with time zone,
    calculated_by_user_id text,
    approved_at timestamp with time zone,
    approved_by_user_id text,
    exported_at timestamp with time zone,
    uf_value numeric(10,2),
    tax_table_version text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT payroll_periods_month_check CHECK (((month >= 1) AND (month <= 12))),
    CONSTRAINT payroll_periods_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'calculated'::text, 'approved'::text, 'exported'::text])))
);


--
-- Name: payroll_receipts; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.payroll_receipts (
    receipt_id text NOT NULL,
    entry_id text NOT NULL,
    period_id text NOT NULL,
    member_id text NOT NULL,
    pay_regime text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    source_event_id text NOT NULL,
    status text DEFAULT 'generated'::text NOT NULL,
    storage_bucket text,
    storage_path text,
    file_size_bytes integer,
    generated_at timestamp with time zone,
    generated_by text,
    generation_error text,
    email_recipient text,
    email_sent_at timestamp with time zone,
    email_delivery_id text,
    email_error text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    template_version text,
    asset_id text,
    CONSTRAINT payroll_receipts_pay_regime_check CHECK ((pay_regime = ANY (ARRAY['chile'::text, 'international'::text]))),
    CONSTRAINT payroll_receipts_status_check CHECK ((status = ANY (ARRAY['generated'::text, 'generation_failed'::text, 'email_sent'::text, 'email_failed'::text])))
);


--
-- Name: previred_afp_rates; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.previred_afp_rates (
    indicator_id text NOT NULL,
    indicator_date date NOT NULL,
    afp_code text NOT NULL,
    afp_name text NOT NULL,
    worker_rate numeric(6,4) NOT NULL,
    employer_rate numeric(6,4) DEFAULT 0 NOT NULL,
    total_rate numeric(6,4) NOT NULL,
    source text,
    source_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: previred_period_indicators; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.previred_period_indicators (
    indicator_id text NOT NULL,
    indicator_date date NOT NULL,
    imm_value numeric(14,2) NOT NULL,
    sis_rate numeric(6,4) NOT NULL,
    unemployment_rate_indefinite numeric(6,4) NOT NULL,
    unemployment_rate_fixed_term numeric(6,4) NOT NULL,
    afp_top_unf numeric(10,2) NOT NULL,
    unemployment_top_unf numeric(10,2) NOT NULL,
    apv_top_unf numeric(10,2) DEFAULT 50 NOT NULL,
    source text,
    source_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: projected_payroll_promotions; Type: TABLE; Schema: greenhouse_payroll; Owner: -
--

CREATE TABLE greenhouse_payroll.projected_payroll_promotions (
    promotion_id text NOT NULL,
    period_id text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    projection_mode text NOT NULL,
    as_of_date date NOT NULL,
    source_snapshot_count integer DEFAULT 0 NOT NULL,
    promoted_entry_count integer DEFAULT 0 NOT NULL,
    source_period_status text,
    actor_user_id text,
    actor_identifier text,
    promotion_status text DEFAULT 'started'::text NOT NULL,
    promoted_at timestamp with time zone,
    failure_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT projected_payroll_promotions_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT projected_payroll_promotions_projection_mode_check CHECK ((projection_mode = ANY (ARRAY['actual_to_date'::text, 'projected_month_end'::text]))),
    CONSTRAINT projected_payroll_promotions_promotion_status_check CHECK ((promotion_status = ANY (ARRAY['started'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: client_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.client_360 AS
 SELECT c.client_id,
    c.public_id,
    c.client_name,
    c.legal_name,
    c.tenant_type,
    c.status,
    c.active,
    c.hubspot_company_id,
    c.timezone,
    c.country_code,
    c.billing_currency,
    c.notes,
    count(DISTINCT cu.user_id) FILTER (WHERE cu.active) AS active_user_count,
    count(DISTINCT csm.assignment_id) FILTER (WHERE csm.active) AS active_module_count,
    COALESCE(array_agg(DISTINCT sm.module_code) FILTER (WHERE (csm.active AND (sm.module_code IS NOT NULL))), ARRAY[]::text[]) AS active_module_codes,
    c.created_at,
    c.updated_at
   FROM (((greenhouse_core.clients c
     LEFT JOIN greenhouse_core.client_users cu ON ((cu.client_id = c.client_id)))
     LEFT JOIN greenhouse_core.client_service_modules csm ON ((csm.client_id = c.client_id)))
     LEFT JOIN greenhouse_core.service_modules sm ON ((sm.module_id = csm.module_id)))
  GROUP BY c.client_id, c.public_id, c.client_name, c.legal_name, c.tenant_type, c.status, c.active, c.hubspot_company_id, c.timezone, c.country_code, c.billing_currency, c.notes, c.created_at, c.updated_at;


--
-- Name: client_capability_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.client_capability_360 AS
 SELECT csm.assignment_id,
    csm.client_id,
    c.client_name,
    c.public_id AS client_public_id,
    csm.module_id,
    sm.module_code,
    sm.module_name,
    sm.business_line,
    csm.source_system,
    csm.source_reference,
    csm.status,
    csm.active,
    csm.assigned_at,
    csm.ends_at,
    csm.created_at,
    csm.updated_at
   FROM ((greenhouse_core.client_service_modules csm
     LEFT JOIN greenhouse_core.clients c ON ((c.client_id = csm.client_id)))
     LEFT JOIN greenhouse_core.service_modules sm ON ((sm.module_id = csm.module_id)));


--
-- Name: client_labor_cost_allocation; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.client_labor_cost_allocation AS
 WITH payroll_period_window AS (
         SELECT pe.member_id,
            pe.currency,
            pe.gross_total,
            pe.net_total,
            pp.year,
            pp.month,
            make_date(pp.year, pp.month, 1) AS period_start,
            (((make_date(pp.year, pp.month, 1) + '1 mon'::interval) - '1 day'::interval))::date AS period_end
           FROM (greenhouse_payroll.payroll_entries pe
             JOIN greenhouse_payroll.payroll_periods pp ON ((pp.period_id = pe.period_id)))
          WHERE (pp.status = ANY (ARRAY['approved'::text, 'exported'::text]))
        ), assignment_overlap AS (
         SELECT pw.member_id,
            pw.currency,
            pw.gross_total,
            pw.net_total,
            pw.year,
            pw.month,
            a.client_id,
            a.fte_allocation
           FROM ((payroll_period_window pw
             JOIN greenhouse_core.client_team_assignments a ON (((a.member_id = pw.member_id) AND (COALESCE(a.start_date, '1900-01-01'::date) <= pw.period_end) AND (COALESCE(a.end_date, '9999-12-31'::date) >= pw.period_start) AND ((a.active = true) OR (a.end_date IS NOT NULL)))))
             LEFT JOIN greenhouse_core.clients c_1 ON ((c_1.client_id = a.client_id)))
          WHERE ((COALESCE(NULLIF(lower(TRIM(BOTH FROM a.client_id)), ''::text), '__missing__'::text) <> ALL (ARRAY['efeonce_internal'::text, 'client_internal'::text, 'space-efeonce'::text])) AND (COALESCE(NULLIF(lower(TRIM(BOTH FROM c_1.client_name)), ''::text), '__missing__'::text) <> ALL (ARRAY['efeonce internal'::text, 'efeonce'::text])))
        ), member_period_total AS (
         SELECT assignment_overlap.member_id,
            assignment_overlap.year,
            assignment_overlap.month,
            COALESCE(sum(assignment_overlap.fte_allocation), (0)::numeric) AS total_fte
           FROM assignment_overlap
          GROUP BY assignment_overlap.member_id, assignment_overlap.year, assignment_overlap.month
        )
 SELECT ao.member_id,
    m.display_name AS member_name,
    ao.client_id,
    COALESCE(c.client_name, ao.client_id) AS client_name,
    ao.year AS period_year,
    ao.month AS period_month,
    ao.currency AS payroll_currency,
    ao.fte_allocation,
    mpt.total_fte,
    fx.rate AS exchange_rate_to_clp,
    ao.gross_total AS gross_total_source,
    ao.net_total AS net_total_source,
    round(((ao.gross_total * ao.fte_allocation) / NULLIF(mpt.total_fte, (0)::numeric)), 2) AS allocated_labor_source,
    round(((ao.net_total * ao.fte_allocation) / NULLIF(mpt.total_fte, (0)::numeric)), 2) AS allocated_net_source,
        CASE
            WHEN (ao.currency = 'CLP'::text) THEN round(((ao.gross_total * ao.fte_allocation) / NULLIF(mpt.total_fte, (0)::numeric)), 2)
            WHEN (fx.rate IS NOT NULL) THEN round((((ao.gross_total * ao.fte_allocation) / NULLIF(mpt.total_fte, (0)::numeric)) * fx.rate), 2)
            ELSE NULL::numeric
        END AS allocated_labor_clp,
        CASE
            WHEN (ao.currency = 'CLP'::text) THEN round(((ao.net_total * ao.fte_allocation) / NULLIF(mpt.total_fte, (0)::numeric)), 2)
            WHEN (fx.rate IS NOT NULL) THEN round((((ao.net_total * ao.fte_allocation) / NULLIF(mpt.total_fte, (0)::numeric)) * fx.rate), 2)
            ELSE NULL::numeric
        END AS allocated_net_clp,
    ao.fte_allocation AS fte_contribution
   FROM ((((assignment_overlap ao
     JOIN member_period_total mpt ON (((mpt.member_id = ao.member_id) AND (mpt.year = ao.year) AND (mpt.month = ao.month))))
     JOIN greenhouse_core.members m ON ((m.member_id = ao.member_id)))
     JOIN greenhouse_core.clients c ON ((c.client_id = ao.client_id)))
     LEFT JOIN LATERAL ( SELECT fx_1.rate
           FROM greenhouse_finance.exchange_rates fx_1
          WHERE ((fx_1.from_currency = ao.currency) AND (fx_1.to_currency = 'CLP'::text) AND (fx_1.rate_date <= ((make_date(ao.year, ao.month, 1) + '1 mon'::interval) - '1 day'::interval)))
          ORDER BY fx_1.rate_date DESC
         LIMIT 1) fx ON ((ao.currency <> 'CLP'::text)))
  WHERE (mpt.total_fte > (0)::numeric);


--
-- Name: commercial_cost_attribution; Type: TABLE; Schema: greenhouse_serving; Owner: -
--

CREATE TABLE greenhouse_serving.commercial_cost_attribution (
    member_id text NOT NULL,
    client_id text NOT NULL,
    client_name text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    base_labor_cost_target numeric(14,2) DEFAULT 0 NOT NULL,
    internal_operational_cost_target numeric(14,2) DEFAULT 0 NOT NULL,
    direct_overhead_target numeric(14,2) DEFAULT 0 NOT NULL,
    shared_overhead_target numeric(14,2) DEFAULT 0 NOT NULL,
    fte_contribution numeric(10,3) DEFAULT 0 NOT NULL,
    allocation_ratio numeric(10,6) DEFAULT 0 NOT NULL,
    commercial_labor_cost_target numeric(14,2) DEFAULT 0 NOT NULL,
    commercial_direct_overhead_target numeric(14,2) DEFAULT 0 NOT NULL,
    commercial_shared_overhead_target numeric(14,2) DEFAULT 0 NOT NULL,
    commercial_loaded_cost_target numeric(14,2) DEFAULT 0 NOT NULL,
    source_of_truth text NOT NULL,
    rule_version text NOT NULL,
    materialization_reason text,
    materialized_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ico_member_metrics; Type: TABLE; Schema: greenhouse_serving; Owner: -
--

CREATE TABLE greenhouse_serving.ico_member_metrics (
    member_id text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    rpa_avg numeric(6,2),
    rpa_median numeric(6,2),
    otd_pct numeric(5,2),
    ftr_pct numeric(5,2),
    cycle_time_avg_days numeric(6,2),
    throughput_count integer,
    pipeline_velocity numeric(10,2),
    stuck_asset_count integer,
    stuck_asset_pct numeric(10,2),
    total_tasks integer,
    completed_tasks integer,
    active_tasks integer,
    on_time_count integer,
    late_drop_count integer,
    overdue_count integer,
    carry_over_count integer,
    overdue_carried_forward_count integer,
    materialized_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ico_organization_metrics; Type: TABLE; Schema: greenhouse_serving; Owner: -
--

CREATE TABLE greenhouse_serving.ico_organization_metrics (
    organization_id text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    rpa_avg numeric(6,2),
    rpa_median numeric(6,2),
    otd_pct numeric(5,2),
    ftr_pct numeric(5,2),
    cycle_time_avg_days numeric(6,2),
    throughput_count integer,
    pipeline_velocity numeric(8,2),
    stuck_asset_count integer,
    stuck_asset_pct numeric(5,2),
    total_tasks integer,
    completed_tasks integer,
    active_tasks integer,
    materialized_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: income_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.income_360 AS
 SELECT i.income_id,
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    i.currency,
    i.subtotal,
    i.tax_amount,
    i.total_amount,
    i.total_amount_clp,
    i.payment_status,
    i.amount_paid,
    i.collection_method,
    i.service_line,
    i.income_type,
    i.is_reconciled,
    c.client_id,
    c.client_name,
    c.hubspot_company_id AS client_hubspot_id,
    ( SELECT count(*) AS count
           FROM greenhouse_finance.income_payments ip
          WHERE (ip.income_id = i.income_id)) AS payment_count,
    ( SELECT count(*) AS count
           FROM greenhouse_finance.factoring_operations fo
          WHERE (fo.income_id = i.income_id)) AS factoring_count,
    fop.total_factoring_fee,
    fop.total_factoring_nominal,
    i.created_at,
    i.updated_at
   FROM ((greenhouse_finance.income i
     LEFT JOIN greenhouse_core.clients c ON ((c.client_id = i.client_id)))
     LEFT JOIN LATERAL ( SELECT sum(fo2.fee_amount) AS total_factoring_fee,
            sum(fo2.nominal_amount) AS total_factoring_nominal
           FROM greenhouse_finance.factoring_operations fo2
          WHERE (fo2.income_id = i.income_id)) fop ON (true));


--
-- Name: member_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.member_360 AS
 SELECT m.member_id,
    m.public_id,
    m.display_name,
    m.primary_email,
    m.phone,
    m.job_level,
    m.employment_type,
    m.hire_date,
    m.contract_end_date,
    m.daily_required,
    m.status,
    m.active,
    m.identity_profile_id,
    ip.public_id AS identity_public_id,
    ip.canonical_email,
    ip.full_name AS identity_full_name,
    ip.profile_type,
    d.department_id,
    d.name AS department_name,
    manager.member_id AS reports_to_member_id,
    manager.display_name AS reports_to_member_name,
    count(DISTINCT cu.user_id) FILTER (WHERE cu.active) AS linked_user_count,
    m.created_at,
    m.updated_at
   FROM ((((greenhouse_core.members m
     LEFT JOIN greenhouse_core.identity_profiles ip ON ((ip.profile_id = m.identity_profile_id)))
     LEFT JOIN greenhouse_core.departments d ON ((d.department_id = m.department_id)))
     LEFT JOIN greenhouse_core.members manager ON ((manager.member_id = m.reports_to_member_id)))
     LEFT JOIN greenhouse_core.client_users cu ON ((cu.identity_profile_id = m.identity_profile_id)))
  GROUP BY m.member_id, m.public_id, m.display_name, m.primary_email, m.phone, m.job_level, m.employment_type, m.hire_date, m.contract_end_date, m.daily_required, m.status, m.active, m.identity_profile_id, ip.public_id, ip.canonical_email, ip.full_name, ip.profile_type, d.department_id, d.name, manager.member_id, manager.display_name, m.created_at, m.updated_at;


--
-- Name: member_capacity_economics; Type: TABLE; Schema: greenhouse_serving; Owner: -
--

CREATE TABLE greenhouse_serving.member_capacity_economics (
    member_id text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    contracted_fte numeric(5,3) DEFAULT 1 NOT NULL,
    contracted_hours integer NOT NULL,
    assigned_hours integer DEFAULT 0 NOT NULL,
    usage_kind text DEFAULT 'missing'::text NOT NULL,
    used_hours numeric(10,2),
    usage_percent numeric(5,2),
    commercial_availability_hours integer NOT NULL,
    operational_availability_hours numeric(10,2),
    source_currency text NOT NULL,
    target_currency text DEFAULT 'CLP'::text NOT NULL,
    total_comp_source numeric(14,2),
    total_labor_cost_target numeric(14,2),
    direct_overhead_target numeric(14,2) DEFAULT 0 NOT NULL,
    shared_overhead_target numeric(14,2) DEFAULT 0 NOT NULL,
    loaded_cost_target numeric(14,2),
    cost_per_hour_target numeric(14,2),
    suggested_bill_rate_target numeric(14,2),
    fx_rate numeric(18,6),
    fx_rate_date date,
    fx_provider text,
    fx_strategy text,
    snapshot_status text DEFAULT 'partial'::text NOT NULL,
    source_compensation_version_id text,
    source_payroll_period_id text,
    assignment_count integer DEFAULT 0 NOT NULL,
    materialized_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: member_leave_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.member_leave_360 AS
 SELECT m.member_id,
    m.display_name,
    m.primary_email,
    m.status AS member_status,
    m.active AS member_active,
    d.name AS department_name,
    mgr.member_id AS supervisor_member_id,
    mgr.display_name AS supervisor_name,
    COALESCE(bal.vacation_allowance, (0)::numeric) AS vacation_allowance,
    COALESCE(bal.vacation_progressive, (0)::numeric) AS vacation_progressive,
    COALESCE(bal.vacation_used, (0)::numeric) AS vacation_used,
    COALESCE(bal.vacation_reserved, (0)::numeric) AS vacation_reserved,
    (((((COALESCE(bal.vacation_allowance, (0)::numeric) + COALESCE(bal.vacation_progressive, (0)::numeric)) + COALESCE(bal.vacation_carried, (0)::numeric)) + COALESCE(bal.vacation_adjustment, (0)::numeric)) - COALESCE(bal.vacation_used, (0)::numeric)) - COALESCE(bal.vacation_reserved, (0)::numeric)) AS vacation_available,
    COALESCE(req.pending_count, (0)::bigint) AS pending_requests,
    COALESCE(req.approved_count, (0)::bigint) AS approved_requests_this_year,
    COALESCE(req.total_approved_days, (0)::numeric) AS total_approved_days_this_year
   FROM ((((greenhouse_core.members m
     LEFT JOIN greenhouse_core.departments d ON ((d.department_id = m.department_id)))
     LEFT JOIN greenhouse_core.members mgr ON ((mgr.member_id = m.reports_to_member_id)))
     LEFT JOIN LATERAL ( SELECT sum(lb.allowance_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_allowance,
            sum(lb.progressive_extra_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_progressive,
            sum(lb.carried_over_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_carried,
            sum(lb.adjustment_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_adjustment,
            sum(lb.used_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_used,
            sum(lb.reserved_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_reserved
           FROM greenhouse_hr.leave_balances lb
          WHERE ((lb.member_id = m.member_id) AND ((lb.year)::numeric = EXTRACT(year FROM CURRENT_DATE)))) bal ON (true))
     LEFT JOIN LATERAL ( SELECT count(*) FILTER (WHERE (lr.status = ANY (ARRAY['pending_supervisor'::text, 'pending_hr'::text]))) AS pending_count,
            count(*) FILTER (WHERE (lr.status = 'approved'::text)) AS approved_count,
            COALESCE(sum(lr.requested_days) FILTER (WHERE (lr.status = 'approved'::text)), (0)::numeric) AS total_approved_days
           FROM greenhouse_hr.leave_requests lr
          WHERE ((lr.member_id = m.member_id) AND (EXTRACT(year FROM lr.start_date) = EXTRACT(year FROM CURRENT_DATE)))) req ON (true))
  WHERE (m.active = true);


--
-- Name: member_payroll_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.member_payroll_360 AS
 SELECT m.member_id,
    m.display_name,
    m.primary_email,
    m.job_level,
    m.employment_type,
    m.status AS member_status,
    m.active AS member_active,
    d.name AS department_name,
    cv.version_id AS current_compensation_version_id,
    cv.pay_regime,
    cv.currency,
    cv.base_salary,
    cv.remote_allowance,
    cv.contract_type,
    cv.effective_from AS compensation_effective_from,
    cv.effective_to AS compensation_effective_to,
    ( SELECT count(*) AS count
           FROM greenhouse_payroll.compensation_versions cv2
          WHERE (cv2.member_id = m.member_id)) AS total_compensation_versions,
    ( SELECT count(*) AS count
           FROM greenhouse_payroll.payroll_entries pe
          WHERE (pe.member_id = m.member_id)) AS total_payroll_entries
   FROM ((greenhouse_core.members m
     LEFT JOIN greenhouse_core.departments d ON ((d.department_id = m.department_id)))
     LEFT JOIN LATERAL ( SELECT cv_inner.version_id,
            cv_inner.member_id,
            cv_inner.version,
            cv_inner.pay_regime,
            cv_inner.currency,
            cv_inner.base_salary,
            cv_inner.remote_allowance,
            cv_inner.bonus_otd_min,
            cv_inner.bonus_otd_max,
            cv_inner.bonus_rpa_min,
            cv_inner.bonus_rpa_max,
            cv_inner.afp_name,
            cv_inner.afp_rate,
            cv_inner.health_system,
            cv_inner.health_plan_uf,
            cv_inner.unemployment_rate,
            cv_inner.contract_type,
            cv_inner.has_apv,
            cv_inner.apv_amount,
            cv_inner.effective_from,
            cv_inner.effective_to,
            cv_inner.is_current,
            cv_inner.change_reason,
            cv_inner.created_by_user_id,
            cv_inner.created_at
           FROM greenhouse_payroll.compensation_versions cv_inner
          WHERE ((cv_inner.member_id = m.member_id) AND (cv_inner.effective_from <= CURRENT_DATE) AND ((cv_inner.effective_to IS NULL) OR (cv_inner.effective_to >= CURRENT_DATE)))
          ORDER BY cv_inner.effective_from DESC, cv_inner.version DESC
         LIMIT 1) cv ON (true))
  WHERE (m.active = true);


--
-- Name: metric_threshold_overrides; Type: TABLE; Schema: greenhouse_serving; Owner: -
--

CREATE TABLE greenhouse_serving.metric_threshold_overrides (
    override_id text DEFAULT ('mto-'::text || (gen_random_uuid())::text) NOT NULL,
    organization_id text NOT NULL,
    metric_code text NOT NULL,
    optimal_min numeric,
    optimal_max numeric,
    attention_min numeric,
    attention_max numeric,
    critical_min numeric,
    critical_max numeric,
    changed_by text,
    changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notion_workspace_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.notion_workspace_360 AS
 SELECT nw.space_id AS notion_workspace_id,
    nw.public_id,
    nw.space_name AS notion_workspace_name,
    nw.space_type,
    nw.client_id,
    c.client_name,
    c.public_id AS client_public_id,
    c.tenant_type,
    nw.primary_project_database_source_id,
    COALESCE(max(nwsb.source_object_id) FILTER (WHERE (nwsb.active AND (nwsb.binding_role = 'delivery_workspace'::text) AND (nwsb.source_system = 'notion'::text) AND (nwsb.source_object_type = 'project_database'::text))), nw.primary_project_database_source_id) AS resolved_project_database_source_id,
    count(DISTINCT nwsb.binding_id) FILTER (WHERE nwsb.active) AS source_binding_count,
    count(DISTINCT cu.user_id) FILTER (WHERE cu.active) AS linked_user_count,
    nw.status,
    nw.active,
    nw.notes,
    nw.created_at,
    nw.updated_at
   FROM (((greenhouse_core.notion_workspaces nw
     LEFT JOIN greenhouse_core.clients c ON ((c.client_id = nw.client_id)))
     LEFT JOIN greenhouse_core.notion_workspace_source_bindings nwsb ON ((nwsb.space_id = nw.space_id)))
     LEFT JOIN greenhouse_core.client_users cu ON ((cu.client_id = nw.client_id)))
  GROUP BY nw.space_id, nw.public_id, nw.space_name, nw.space_type, nw.client_id, c.client_name, c.public_id, c.tenant_type, nw.primary_project_database_source_id, nw.status, nw.active, nw.notes, nw.created_at, nw.updated_at;


--
-- Name: operational_pl_snapshots; Type: TABLE; Schema: greenhouse_serving; Owner: -
--

CREATE TABLE greenhouse_serving.operational_pl_snapshots (
    snapshot_id text NOT NULL,
    scope_type text NOT NULL,
    scope_id text NOT NULL,
    scope_name text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    period_closed boolean DEFAULT false NOT NULL,
    snapshot_revision integer DEFAULT 1 NOT NULL,
    currency text DEFAULT 'CLP'::text NOT NULL,
    revenue_clp numeric(18,2) DEFAULT 0 NOT NULL,
    labor_cost_clp numeric(18,2) DEFAULT 0 NOT NULL,
    direct_expense_clp numeric(18,2) DEFAULT 0 NOT NULL,
    overhead_clp numeric(18,2) DEFAULT 0 NOT NULL,
    total_cost_clp numeric(18,2) DEFAULT 0 NOT NULL,
    gross_margin_clp numeric(18,2) DEFAULT 0 NOT NULL,
    gross_margin_pct numeric(5,2),
    headcount_fte numeric(6,2),
    revenue_per_fte_clp numeric(18,2),
    cost_per_fte_clp numeric(18,2),
    computation_reason text,
    materialized_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT operational_pl_snapshots_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT operational_pl_snapshots_scope_type_check CHECK ((scope_type = ANY (ARRAY['client'::text, 'space'::text, 'organization'::text])))
);


--
-- Name: organization_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.organization_360 AS
 SELECT organization_id,
    public_id,
    organization_name,
    legal_name,
    tax_id,
    tax_id_type,
    industry,
    country,
    hubspot_company_id,
    status,
    active,
    notes,
    created_at,
    updated_at,
    COALESCE(organization_type, 'other'::text) AS organization_type,
    ( SELECT json_agg(json_build_object('spaceId', s.space_id, 'publicId', s.public_id, 'spaceName', s.space_name, 'spaceType', s.space_type, 'clientId', s.client_id, 'status', s.status) ORDER BY s.space_name) AS json_agg
           FROM greenhouse_core.spaces s
          WHERE ((s.organization_id = o.organization_id) AND (s.active = true))) AS spaces,
    ( SELECT json_agg(json_build_object('membershipId', pm.membership_id, 'publicId', pm.public_id, 'profileId', pm.profile_id, 'fullName', ip.full_name, 'canonicalEmail', ip.canonical_email, 'membershipType', pm.membership_type, 'roleLabel', pm.role_label, 'department', pm.department, 'isPrimary', pm.is_primary, 'spaceId', pm.space_id) ORDER BY pm.is_primary DESC, ip.full_name) AS json_agg
           FROM (greenhouse_core.person_memberships pm
             JOIN greenhouse_core.identity_profiles ip ON ((ip.profile_id = pm.profile_id)))
          WHERE ((pm.organization_id = o.organization_id) AND (pm.active = true))) AS people,
    ( SELECT count(*) AS count
           FROM greenhouse_core.spaces s
          WHERE ((s.organization_id = o.organization_id) AND (s.active = true))) AS space_count,
    ( SELECT count(*) AS count
           FROM greenhouse_core.person_memberships pm
          WHERE ((pm.organization_id = o.organization_id) AND (pm.active = true))) AS membership_count,
    ( SELECT count(DISTINCT pm.profile_id) AS count
           FROM greenhouse_core.person_memberships pm
          WHERE ((pm.organization_id = o.organization_id) AND (pm.active = true))) AS unique_person_count
   FROM greenhouse_core.organizations o;


--
-- Name: organization_operational_metrics; Type: TABLE; Schema: greenhouse_serving; Owner: -
--

CREATE TABLE greenhouse_serving.organization_operational_metrics (
    organization_id text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    tasks_completed integer DEFAULT 0 NOT NULL,
    tasks_active integer DEFAULT 0 NOT NULL,
    tasks_total integer DEFAULT 0 NOT NULL,
    rpa_avg numeric(6,2),
    otd_pct numeric(5,2),
    ftr_pct numeric(5,2),
    cycle_time_avg_days numeric(6,2),
    throughput_count integer,
    stuck_asset_count integer DEFAULT 0,
    source text DEFAULT 'ico_organization_metrics'::text NOT NULL,
    materialized_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: period_closure_status; Type: TABLE; Schema: greenhouse_serving; Owner: -
--

CREATE TABLE greenhouse_serving.period_closure_status (
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    closure_status text NOT NULL,
    payroll_closed boolean DEFAULT false NOT NULL,
    income_closed boolean DEFAULT false NOT NULL,
    expenses_closed boolean DEFAULT false NOT NULL,
    reconciliation_closed boolean DEFAULT false NOT NULL,
    fx_locked boolean DEFAULT false NOT NULL,
    readiness_pct integer DEFAULT 0 NOT NULL,
    snapshot_revision integer DEFAULT 1 NOT NULL,
    materialized_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT period_closure_status_closure_status_check CHECK ((closure_status = ANY (ARRAY['open'::text, 'ready'::text, 'closed'::text, 'reopened'::text]))),
    CONSTRAINT period_closure_status_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT period_closure_status_readiness_pct_check CHECK (((readiness_pct >= 0) AND (readiness_pct <= 100)))
);


--
-- Name: person_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.person_360 AS
 WITH member_rollup AS (
         SELECT m_1.identity_profile_id,
            (count(*))::integer AS member_count,
            (array_agg(m_1.member_id ORDER BY m_1.active DESC, m_1.updated_at DESC NULLS LAST, m_1.created_at DESC NULLS LAST))[1] AS primary_member_id,
            (array_agg(m_1.public_id ORDER BY m_1.active DESC, m_1.updated_at DESC NULLS LAST, m_1.created_at DESC NULLS LAST))[1] AS primary_member_public_id,
            (array_agg(m_1.display_name ORDER BY m_1.active DESC, m_1.updated_at DESC NULLS LAST, m_1.created_at DESC NULLS LAST))[1] AS member_display_name,
            (array_agg(m_1.primary_email ORDER BY m_1.active DESC, m_1.updated_at DESC NULLS LAST, m_1.created_at DESC NULLS LAST))[1] AS member_email,
            (array_agg(m_1.department_id ORDER BY m_1.active DESC, m_1.updated_at DESC NULLS LAST, m_1.created_at DESC NULLS LAST))[1] AS primary_department_id,
            bool_or(m_1.active) AS has_active_member
           FROM greenhouse_core.members m_1
          WHERE (m_1.identity_profile_id IS NOT NULL)
          GROUP BY m_1.identity_profile_id
        ), user_rollup AS (
         SELECT u_1.identity_profile_id,
            (count(*))::integer AS user_count,
            (count(*) FILTER (WHERE u_1.active))::integer AS active_user_count,
            (count(*) FILTER (WHERE (u_1.tenant_type = 'efeonce_internal'::text)))::integer AS internal_user_count,
            (count(*) FILTER (WHERE (u_1.tenant_type <> 'efeonce_internal'::text)))::integer AS client_user_count,
            (array_agg(u_1.user_id ORDER BY u_1.active DESC, u_1.updated_at DESC NULLS LAST, u_1.created_at DESC NULLS LAST))[1] AS primary_user_id,
            (array_agg(u_1.public_id ORDER BY u_1.active DESC, u_1.updated_at DESC NULLS LAST, u_1.created_at DESC NULLS LAST))[1] AS primary_user_public_id,
            (array_agg(u_1.email ORDER BY u_1.active DESC, u_1.updated_at DESC NULLS LAST, u_1.created_at DESC NULLS LAST))[1] AS primary_user_email,
            (array_agg(u_1.full_name ORDER BY u_1.active DESC, u_1.updated_at DESC NULLS LAST, u_1.created_at DESC NULLS LAST))[1] AS primary_user_name,
            array_remove(array_agg(DISTINCT u_1.user_id), NULL::text) AS user_ids,
            array_remove(array_agg(DISTINCT u_1.email), NULL::text) AS user_emails,
            array_remove(array_agg(DISTINCT u_1.client_id), NULL::text) AS user_client_ids,
            array_remove(array_agg(DISTINCT u_1.tenant_type), NULL::text) AS tenant_types
           FROM greenhouse_core.client_users u_1
          WHERE (u_1.identity_profile_id IS NOT NULL)
          GROUP BY u_1.identity_profile_id
        ), contact_rollup AS (
         SELECT c_1.linked_identity_profile_id AS identity_profile_id,
            (count(*))::integer AS contact_count,
            (array_agg(c_1.contact_record_id ORDER BY c_1.updated_at DESC NULLS LAST, c_1.created_at DESC NULLS LAST))[1] AS primary_contact_record_id,
            (array_agg(c_1.hubspot_contact_id ORDER BY c_1.updated_at DESC NULLS LAST, c_1.created_at DESC NULLS LAST))[1] AS primary_hubspot_contact_id,
            (array_agg(c_1.display_name ORDER BY c_1.updated_at DESC NULLS LAST, c_1.created_at DESC NULLS LAST))[1] AS primary_contact_name,
            (array_agg(c_1.email ORDER BY c_1.updated_at DESC NULLS LAST, c_1.created_at DESC NULLS LAST))[1] AS primary_contact_email,
            array_remove(array_agg(DISTINCT c_1.contact_record_id), NULL::text) AS contact_record_ids,
            array_remove(array_agg(DISTINCT c_1.client_id), NULL::text) AS contact_client_ids,
            array_remove(array_agg(DISTINCT c_1.email), NULL::text) AS contact_emails,
            bool_or((c_1.active AND (NOT COALESCE(c_1.is_deleted, false)))) AS has_active_contact
           FROM greenhouse_crm.contacts c_1
          WHERE (c_1.linked_identity_profile_id IS NOT NULL)
          GROUP BY c_1.linked_identity_profile_id
        ), membership_rollup AS (
         SELECT pm.profile_id AS identity_profile_id,
            (count(*))::integer AS membership_count,
            ( SELECT json_agg(json_build_object('membershipId', sub.membership_id, 'organizationId', sub.organization_id, 'organizationName', o.organization_name, 'spaceId', sub.space_id, 'membershipType', sub.membership_type, 'roleLabel', sub.role_label, 'isPrimary', sub.is_primary) ORDER BY sub.is_primary DESC, o.organization_name) AS json_agg
                   FROM (greenhouse_core.person_memberships sub
                     LEFT JOIN greenhouse_core.organizations o ON ((o.organization_id = sub.organization_id)))
                  WHERE ((sub.profile_id = pm.profile_id) AND (sub.active = true))) AS memberships_json,
            array_remove(array_agg(DISTINCT pm.organization_id), NULL::text) AS organization_ids
           FROM greenhouse_core.person_memberships pm
          WHERE (pm.active = true)
          GROUP BY pm.profile_id
        )
 SELECT p.profile_id AS identity_profile_id,
    p.public_id AS identity_profile_public_id,
    p.profile_type,
    p.canonical_email,
    COALESCE(NULLIF(TRIM(BOTH FROM p.full_name), ''::text), NULLIF(TRIM(BOTH FROM m.member_display_name), ''::text), NULLIF(TRIM(BOTH FROM u.primary_user_name), ''::text), NULLIF(TRIM(BOTH FROM c.primary_contact_name), ''::text)) AS display_name,
    p.full_name AS profile_full_name,
    p.job_title,
    p.status AS profile_status,
    p.active AS profile_active,
    p.default_auth_mode,
    p.primary_source_system,
    p.primary_source_object_type,
    p.primary_source_object_id,
    m.primary_member_id,
    m.primary_member_public_id,
    m.member_count,
    m.member_display_name,
    m.member_email,
    m.primary_department_id,
    COALESCE(m.has_active_member, false) AS has_active_member,
    u.primary_user_id,
    u.primary_user_public_id,
    u.user_count,
    u.active_user_count,
    u.internal_user_count,
    u.client_user_count,
    u.primary_user_email,
    u.primary_user_name,
    COALESCE(u.user_ids, ARRAY[]::text[]) AS user_ids,
    COALESCE(u.user_emails, ARRAY[]::text[]) AS user_emails,
    COALESCE(u.user_client_ids, ARRAY[]::text[]) AS user_client_ids,
    COALESCE(u.tenant_types, ARRAY[]::text[]) AS tenant_types,
    c.primary_contact_record_id,
    c.primary_hubspot_contact_id,
    c.contact_count,
    c.primary_contact_name,
    c.primary_contact_email,
    COALESCE(c.contact_record_ids, ARRAY[]::text[]) AS contact_record_ids,
    COALESCE(c.contact_client_ids, ARRAY[]::text[]) AS contact_client_ids,
    COALESCE(c.contact_emails, ARRAY[]::text[]) AS contact_emails,
    COALESCE(c.has_active_contact, false) AS has_active_contact,
    (m.primary_member_id IS NOT NULL) AS has_member_facet,
    (u.primary_user_id IS NOT NULL) AS has_user_facet,
    (c.primary_contact_record_id IS NOT NULL) AS has_crm_contact_facet,
    ((mbr.membership_count IS NOT NULL) AND (mbr.membership_count > 0)) AS has_membership_facet,
    array_remove(ARRAY[
        CASE
            WHEN (m.primary_member_id IS NOT NULL) THEN 'member'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (u.primary_user_id IS NOT NULL) THEN 'user'::text
            ELSE NULL::text
        END,
        CASE
            WHEN (c.primary_contact_record_id IS NOT NULL) THEN 'crm_contact'::text
            ELSE NULL::text
        END,
        CASE
            WHEN ((mbr.membership_count IS NOT NULL) AND (mbr.membership_count > 0)) THEN 'membership'::text
            ELSE NULL::text
        END], NULL::text) AS person_facets,
    COALESCE(mbr.membership_count, 0) AS membership_count,
    mbr.memberships_json AS memberships,
    COALESCE(mbr.organization_ids, ARRAY[]::text[]) AS organization_ids,
    p.created_at,
    p.updated_at
   FROM ((((greenhouse_core.identity_profiles p
     LEFT JOIN member_rollup m ON ((m.identity_profile_id = p.profile_id)))
     LEFT JOIN user_rollup u ON ((u.identity_profile_id = p.profile_id)))
     LEFT JOIN contact_rollup c ON ((c.identity_profile_id = p.profile_id)))
     LEFT JOIN membership_rollup mbr ON ((mbr.identity_profile_id = p.profile_id)));


--
-- Name: person_delivery_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.person_delivery_360 AS
 SELECT ip.profile_id AS identity_profile_id,
    ip.public_id AS eo_id,
    m.member_id,
    COALESCE(m.display_name, ip.full_name, 'Sin nombre'::text) AS resolved_display_name,
    m.primary_email AS member_email,
    d.name AS department_name,
    COALESCE(proj.owned_count, 0) AS owned_projects_count,
    COALESCE(proj.active_owned_count, 0) AS active_owned_projects,
    COALESCE(tasks.total_assigned, 0) AS total_assigned_tasks,
    COALESCE(tasks.active_tasks, 0) AS active_tasks,
    COALESCE(tasks.completed_30d, 0) AS completed_tasks_30d,
    COALESCE(tasks.overdue_tasks, 0) AS overdue_tasks,
    tasks.avg_rpa_30d,
    tasks.on_time_pct_30d,
    COALESCE(crm_agg.owned_companies, 0) AS owned_companies_count,
    COALESCE(crm_agg.owned_deals, 0) AS owned_deals_count,
    COALESCE(crm_agg.open_deals_amount, (0)::numeric) AS open_deals_amount
   FROM (((((greenhouse_core.identity_profiles ip
     LEFT JOIN greenhouse_core.members m ON ((m.identity_profile_id = ip.profile_id)))
     LEFT JOIN greenhouse_core.departments d ON ((d.department_id = m.department_id)))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS owned_count,
            (count(*) FILTER (WHERE (p.active AND (NOT p.is_deleted))))::integer AS active_owned_count
           FROM greenhouse_delivery.projects p
          WHERE (p.owner_member_id = m.member_id)) proj ON ((m.member_id IS NOT NULL)))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS total_assigned,
            (count(*) FILTER (WHERE ((t.task_status <> ALL (ARRAY['Listo'::text, 'Done'::text, 'Finalizado'::text, 'Completado'::text, 'Cancelado'::text, 'Cancelada'::text, 'Cancelled'::text, 'Canceled'::text])) AND (NOT t.is_deleted))))::integer AS active_tasks,
            (count(*) FILTER (WHERE ((t.completed_at >= (CURRENT_DATE - '30 days'::interval)) AND (NOT t.is_deleted))))::integer AS completed_30d,
            (count(*) FILTER (WHERE ((t.due_date < CURRENT_DATE) AND (t.task_status <> ALL (ARRAY['Listo'::text, 'Done'::text, 'Finalizado'::text, 'Completado'::text, 'Cancelado'::text, 'Cancelada'::text, 'Cancelled'::text, 'Canceled'::text])) AND (NOT t.is_deleted))))::integer AS overdue_tasks,
            avg(t.rpa_value) FILTER (WHERE ((t.completed_at >= (CURRENT_DATE - '30 days'::interval)) AND (t.rpa_value IS NOT NULL) AND (t.rpa_value > (0)::numeric) AND (NOT t.is_deleted))) AS avg_rpa_30d,
                CASE
                    WHEN (count(*) FILTER (WHERE ((t.completed_at >= (CURRENT_DATE - '30 days'::interval)) AND (t.completed_at IS NOT NULL) AND (t.due_date IS NOT NULL) AND (NOT t.is_deleted))) = 0) THEN NULL::numeric
                    ELSE round(((100.0 * (count(*) FILTER (WHERE ((t.completed_at >= (CURRENT_DATE - '30 days'::interval)) AND (t.completed_at <= (t.due_date + '1 day'::interval)) AND (NOT t.is_deleted))))::numeric) / (NULLIF(count(*) FILTER (WHERE ((t.completed_at >= (CURRENT_DATE - '30 days'::interval)) AND (t.completed_at IS NOT NULL) AND (t.due_date IS NOT NULL) AND (NOT t.is_deleted))), 0))::numeric), 1)
                END AS on_time_pct_30d
           FROM greenhouse_delivery.tasks t
          WHERE (t.assignee_member_id = m.member_id)) tasks ON ((m.member_id IS NOT NULL)))
     LEFT JOIN LATERAL ( SELECT ( SELECT (count(*))::integer AS count
                   FROM greenhouse_crm.companies co
                  WHERE ((co.owner_member_id = m.member_id) AND (NOT co.is_deleted))) AS owned_companies,
            (count(*))::integer AS owned_deals,
            COALESCE(sum(dl.amount) FILTER (WHERE ((NOT dl.is_closed_won) AND (NOT dl.is_closed_lost) AND (NOT dl.is_deleted))), (0)::numeric) AS open_deals_amount
           FROM greenhouse_crm.deals dl
          WHERE ((dl.owner_member_id = m.member_id) AND (NOT dl.is_deleted))) crm_agg ON ((m.member_id IS NOT NULL)));


--
-- Name: person_finance_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.person_finance_360 AS
 SELECT ip.profile_id AS identity_profile_id,
    ip.public_id AS eo_id,
    m.member_id,
    COALESCE(m.display_name, ip.full_name, 'Sin nombre'::text) AS resolved_display_name,
    m.primary_email AS member_email,
    d.name AS department_name,
    cv.version_id AS current_comp_version_id,
    cv.pay_regime,
    cv.currency AS comp_currency,
    cv.base_salary,
    cv.remote_allowance,
    cv.bonus_otd_min,
    cv.bonus_otd_max,
    cv.bonus_rpa_min,
    cv.bonus_rpa_max,
    cv.contract_type,
    cv.effective_from AS comp_effective_from,
    cv.effective_to AS comp_effective_to,
    COALESCE(pay_agg.total_entries, 0) AS total_payroll_entries,
    pay_agg.latest_year,
    pay_agg.latest_month,
    pay_agg.latest_gross,
    pay_agg.latest_net,
    pay_agg.latest_currency,
    COALESCE(exp_agg.expense_count, 0) AS expense_count,
    COALESCE(exp_agg.paid_expense_count, 0) AS paid_expense_count,
    COALESCE(exp_agg.total_expenses_clp, (0)::numeric) AS total_expenses_clp,
    exp_agg.last_expense_date
   FROM (((((greenhouse_core.identity_profiles ip
     LEFT JOIN greenhouse_core.members m ON ((m.identity_profile_id = ip.profile_id)))
     LEFT JOIN greenhouse_core.departments d ON ((d.department_id = m.department_id)))
     LEFT JOIN LATERAL ( SELECT cv_inner.version_id,
            cv_inner.pay_regime,
            cv_inner.currency,
            cv_inner.base_salary,
            cv_inner.remote_allowance,
            cv_inner.bonus_otd_min,
            cv_inner.bonus_otd_max,
            cv_inner.bonus_rpa_min,
            cv_inner.bonus_rpa_max,
            cv_inner.contract_type,
            cv_inner.effective_from,
            cv_inner.effective_to
           FROM greenhouse_payroll.compensation_versions cv_inner
          WHERE ((cv_inner.member_id = m.member_id) AND (cv_inner.effective_from <= CURRENT_DATE) AND ((cv_inner.effective_to IS NULL) OR (cv_inner.effective_to >= CURRENT_DATE)))
          ORDER BY cv_inner.effective_from DESC, cv_inner.version DESC
         LIMIT 1) cv ON ((m.member_id IS NOT NULL)))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS total_entries,
            max(pp.year) AS latest_year,
            (array_agg(pp.month ORDER BY pp.year DESC, pp.month DESC))[1] AS latest_month,
            (array_agg(pe.gross_total ORDER BY pp.year DESC, pp.month DESC))[1] AS latest_gross,
            (array_agg(pe.net_total ORDER BY pp.year DESC, pp.month DESC))[1] AS latest_net,
            (array_agg(pe.currency ORDER BY pp.year DESC, pp.month DESC))[1] AS latest_currency
           FROM (greenhouse_payroll.payroll_entries pe
             JOIN greenhouse_payroll.payroll_periods pp ON ((pp.period_id = pe.period_id)))
          WHERE (pe.member_id = m.member_id)) pay_agg ON ((m.member_id IS NOT NULL)))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS expense_count,
            (count(*) FILTER (WHERE (e.payment_status = 'paid'::text)))::integer AS paid_expense_count,
            COALESCE(sum(e.total_amount_clp), (0)::numeric) AS total_expenses_clp,
            max(COALESCE(e.payment_date, e.document_date)) AS last_expense_date
           FROM greenhouse_finance.expenses e
          WHERE (e.member_id = m.member_id)) exp_agg ON ((m.member_id IS NOT NULL)));


--
-- Name: person_hr_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.person_hr_360 AS
 SELECT ip.profile_id AS identity_profile_id,
    ip.public_id AS eo_id,
    m.member_id,
    COALESCE(m.display_name, ip.full_name, 'Sin nombre'::text) AS resolved_display_name,
    m.primary_email AS member_email,
    d.name AS department_name,
    m.job_level,
    m.employment_type,
    m.hire_date,
    m.contract_end_date,
    m.daily_required,
    m.reports_to_member_id,
    mgr.display_name AS supervisor_name,
    COALESCE(bal.vacation_allowance, (0)::numeric) AS vacation_allowance,
    COALESCE(bal.vacation_carried, (0)::numeric) AS vacation_carried,
    COALESCE(bal.vacation_used, (0)::numeric) AS vacation_used,
    COALESCE(bal.vacation_reserved, (0)::numeric) AS vacation_reserved,
    (((((COALESCE(bal.vacation_allowance, (0)::numeric) + COALESCE(bal.vacation_progressive, (0)::numeric)) + COALESCE(bal.vacation_carried, (0)::numeric)) + COALESCE(bal.vacation_adjustment, (0)::numeric)) - COALESCE(bal.vacation_used, (0)::numeric)) - COALESCE(bal.vacation_reserved, (0)::numeric)) AS vacation_available,
    COALESCE(bal.personal_allowance, (0)::numeric) AS personal_allowance,
    COALESCE(bal.personal_used, (0)::numeric) AS personal_used,
    COALESCE(req.pending_count, 0) AS pending_requests,
    COALESCE(req.approved_count, 0) AS approved_requests_this_year,
    COALESCE(req.total_approved_days, (0)::numeric) AS total_approved_days_this_year,
    cv.pay_regime,
    cv.currency AS comp_currency,
    cv.base_salary,
    cv.contract_type
   FROM ((((((greenhouse_core.identity_profiles ip
     LEFT JOIN greenhouse_core.members m ON ((m.identity_profile_id = ip.profile_id)))
     LEFT JOIN greenhouse_core.departments d ON ((d.department_id = m.department_id)))
     LEFT JOIN greenhouse_core.members mgr ON ((mgr.member_id = m.reports_to_member_id)))
     LEFT JOIN LATERAL ( SELECT sum(lb.allowance_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_allowance,
            sum(lb.progressive_extra_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_progressive,
            sum(lb.carried_over_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_carried,
            sum(lb.adjustment_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_adjustment,
            sum(lb.used_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_used,
            sum(lb.reserved_days) FILTER (WHERE (lb.leave_type_code = 'vacation'::text)) AS vacation_reserved,
            sum(lb.allowance_days) FILTER (WHERE (lb.leave_type_code = 'personal'::text)) AS personal_allowance,
            sum(lb.used_days) FILTER (WHERE (lb.leave_type_code = 'personal'::text)) AS personal_used
           FROM greenhouse_hr.leave_balances lb
          WHERE ((lb.member_id = m.member_id) AND ((lb.year)::numeric = EXTRACT(year FROM CURRENT_DATE)))) bal ON ((m.member_id IS NOT NULL)))
     LEFT JOIN LATERAL ( SELECT (count(*) FILTER (WHERE (lr.status = ANY (ARRAY['pending_supervisor'::text, 'pending_hr'::text]))))::integer AS pending_count,
            (count(*) FILTER (WHERE (lr.status = 'approved'::text)))::integer AS approved_count,
            COALESCE(sum(lr.requested_days) FILTER (WHERE (lr.status = 'approved'::text)), (0)::numeric) AS total_approved_days
           FROM greenhouse_hr.leave_requests lr
          WHERE ((lr.member_id = m.member_id) AND (EXTRACT(year FROM lr.start_date) = EXTRACT(year FROM CURRENT_DATE)))) req ON ((m.member_id IS NOT NULL)))
     LEFT JOIN LATERAL ( SELECT cv_inner.pay_regime,
            cv_inner.currency,
            cv_inner.base_salary,
            cv_inner.contract_type
           FROM greenhouse_payroll.compensation_versions cv_inner
          WHERE ((cv_inner.member_id = m.member_id) AND (cv_inner.effective_from <= CURRENT_DATE) AND ((cv_inner.effective_to IS NULL) OR (cv_inner.effective_to >= CURRENT_DATE)))
          ORDER BY cv_inner.effective_from DESC, cv_inner.version DESC
         LIMIT 1) cv ON ((m.member_id IS NOT NULL)));


--
-- Name: person_operational_360; Type: TABLE; Schema: greenhouse_serving; Owner: -
--

CREATE TABLE greenhouse_serving.person_operational_360 (
    member_id text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    rpa_avg numeric(6,2),
    rpa_median numeric(6,2),
    otd_pct numeric(5,2),
    ftr_pct numeric(5,2),
    cycle_time_avg_days numeric(6,2),
    cycle_time_p50_days numeric(6,2),
    cycle_time_variance numeric(6,2),
    throughput_count integer,
    pipeline_velocity numeric(10,2),
    stuck_asset_count integer DEFAULT 0,
    stuck_asset_pct numeric(10,2),
    total_tasks integer DEFAULT 0,
    completed_tasks integer DEFAULT 0,
    active_tasks integer DEFAULT 0,
    utilization_pct numeric(5,2),
    allocation_variance numeric(5,3),
    cost_per_asset numeric(14,2),
    cost_per_hour numeric(14,2),
    quality_index numeric(5,2),
    dedication_index numeric(5,2),
    role_category text,
    total_fte_allocation numeric(5,3),
    contracted_hours_month integer,
    assigned_hours_month integer,
    used_hours_month integer,
    available_hours_month integer,
    expected_throughput numeric(6,1),
    capacity_health text,
    overcommitted boolean DEFAULT false,
    active_assignment_count integer DEFAULT 0,
    compensation_currency text,
    monthly_base_salary numeric(14,2),
    monthly_total_comp numeric(14,2),
    compensation_version_id text,
    source text DEFAULT 'person_intelligence'::text NOT NULL,
    engine_version text,
    materialized_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: projected_payroll_snapshots; Type: TABLE; Schema: greenhouse_serving; Owner: -
--

CREATE TABLE greenhouse_serving.projected_payroll_snapshots (
    member_id text NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    projection_mode text NOT NULL,
    as_of_date date NOT NULL,
    currency text NOT NULL,
    base_salary numeric(14,2) DEFAULT 0 NOT NULL,
    remote_allowance numeric(14,2) DEFAULT 0 NOT NULL,
    fixed_bonus_amount numeric(14,2) DEFAULT 0 NOT NULL,
    bonus_otd_amount numeric(14,2) DEFAULT 0 NOT NULL,
    bonus_rpa_amount numeric(14,2) DEFAULT 0 NOT NULL,
    gross_total numeric(14,2) DEFAULT 0 NOT NULL,
    total_deductions numeric(14,2) DEFAULT 0 NOT NULL,
    net_total numeric(14,2) DEFAULT 0 NOT NULL,
    kpi_otd_percent numeric(5,2),
    kpi_rpa_avg numeric(5,2),
    working_days_cut integer,
    working_days_total integer,
    days_absent integer DEFAULT 0,
    days_on_leave integer DEFAULT 0,
    uf_value numeric(10,2),
    snapshot_status text DEFAULT 'projected'::text NOT NULL,
    materialized_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT projected_payroll_snapshots_projection_mode_check CHECK ((projection_mode = ANY (ARRAY['actual_to_date'::text, 'projected_month_end'::text])))
);


--
-- Name: provider_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.provider_360 AS
 SELECT p.provider_id,
    p.public_id,
    p.provider_name,
    p.legal_name,
    p.provider_type,
    p.website_url,
    p.primary_email,
    p.primary_contact_name,
    p.country_code,
    p.status,
    p.active,
    p.notes,
    count(DISTINCT esl.link_id) FILTER (WHERE esl.active) AS source_link_count,
    p.created_at,
    p.updated_at
   FROM (greenhouse_core.providers p
     LEFT JOIN greenhouse_core.entity_source_links esl ON (((esl.entity_type = 'provider'::text) AND (esl.entity_id = p.provider_id))))
  GROUP BY p.provider_id, p.public_id, p.provider_name, p.legal_name, p.provider_type, p.website_url, p.primary_email, p.primary_contact_name, p.country_code, p.status, p.active, p.notes, p.created_at, p.updated_at;


--
-- Name: provider_finance_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.provider_finance_360 AS
 SELECT p.provider_id,
    p.public_id,
    p.provider_name,
    p.legal_name AS provider_legal_name,
    p.provider_type,
    p.primary_email AS provider_primary_email,
    p.primary_contact_name AS provider_primary_contact_name,
    p.country_code AS provider_country_code,
    p.status AS provider_status,
    p.active AS provider_active,
    s.supplier_id,
    s.legal_name AS supplier_legal_name,
    s.trade_name AS supplier_trade_name,
    s.category AS supplier_category,
    s.service_type AS supplier_service_type,
    s.payment_currency,
    s.default_payment_terms,
    s.default_payment_method,
    s.requires_po,
    s.is_active AS supplier_active,
    s.created_at AS supplier_created_at,
    s.updated_at AS supplier_updated_at
   FROM (greenhouse_core.providers p
     LEFT JOIN greenhouse_finance.suppliers s ON ((s.provider_id = p.provider_id)));


--
-- Name: session_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.session_360 AS
 SELECT u.user_id,
    u.public_id,
    u.email,
    u.full_name,
    u.tenant_type,
    u.auth_mode,
    u.status,
    u.active,
    u.client_id,
    c.client_name,
    u.identity_profile_id,
    u.member_id,
    u.microsoft_oid,
    u.microsoft_tenant_id,
    u.microsoft_email,
    u.google_sub,
    u.google_email,
    u.avatar_url,
    u.password_hash,
    u.password_hash_algorithm,
    COALESCE(u.timezone, c.timezone, 'America/Santiago'::text) AS timezone,
    u.default_portal_home_path,
    u.last_login_at,
    u.last_login_provider,
    spc.space_id,
    spc.public_id AS space_public_id,
    org.organization_id,
    org.public_id AS organization_public_id,
    org.organization_name,
    COALESCE(array_agg(DISTINCT ura.role_code) FILTER (WHERE (ura.active AND (ura.role_code IS NOT NULL) AND ((ura.effective_to IS NULL) OR (ura.effective_to > CURRENT_TIMESTAMP)))), ARRAY[]::text[]) AS role_codes,
    COALESCE(array_agg(DISTINCT rg.rg) FILTER (WHERE (rg.rg IS NOT NULL)), ARRAY[]::text[]) AS route_groups,
    COALESCE(array_agg(DISTINCT cff.flag_code) FILTER (WHERE cff.enabled), ARRAY[]::text[]) AS feature_flags
   FROM (((((((greenhouse_core.client_users u
     LEFT JOIN greenhouse_core.clients c ON ((c.client_id = u.client_id)))
     LEFT JOIN greenhouse_core.spaces spc ON (((spc.client_id = u.client_id) AND (spc.active = true))))
     LEFT JOIN greenhouse_core.organizations org ON (((org.organization_id = spc.organization_id) AND (org.active = true))))
     LEFT JOIN greenhouse_core.user_role_assignments ura ON ((ura.user_id = u.user_id)))
     LEFT JOIN greenhouse_core.roles r ON ((r.role_code = ura.role_code)))
     LEFT JOIN LATERAL unnest(r.route_group_scope) rg(rg) ON (true))
     LEFT JOIN greenhouse_core.client_feature_flags cff ON ((cff.client_id = u.client_id)))
  GROUP BY u.user_id, u.public_id, u.email, u.full_name, u.tenant_type, u.auth_mode, u.status, u.active, u.client_id, c.client_name, c.timezone, u.identity_profile_id, u.member_id, u.microsoft_oid, u.microsoft_tenant_id, u.microsoft_email, u.google_sub, u.google_email, u.avatar_url, u.password_hash, u.password_hash_algorithm, u.timezone, u.default_portal_home_path, u.last_login_at, u.last_login_provider, spc.space_id, spc.public_id, org.organization_id, org.public_id, org.organization_name;


--
-- Name: staff_aug_placement_snapshots; Type: TABLE; Schema: greenhouse_serving; Owner: -
--

CREATE TABLE greenhouse_serving.staff_aug_placement_snapshots (
    snapshot_id text NOT NULL,
    placement_id text NOT NULL,
    assignment_id text NOT NULL,
    client_id text NOT NULL,
    client_name text,
    space_id text,
    space_name text,
    organization_id text,
    organization_name text,
    member_id text NOT NULL,
    member_name text,
    provider_id text,
    provider_name text,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    period_id text NOT NULL,
    placement_status text NOT NULL,
    billing_rate_amount numeric(14,2),
    billing_rate_currency text,
    projected_revenue_clp numeric(14,2) DEFAULT 0 NOT NULL,
    cost_rate_amount numeric(14,2),
    cost_rate_currency text,
    payroll_gross_clp numeric(14,2) DEFAULT 0 NOT NULL,
    payroll_employer_cost_clp numeric(14,2) DEFAULT 0 NOT NULL,
    commercial_loaded_cost_clp numeric(14,2) DEFAULT 0 NOT NULL,
    member_direct_expense_clp numeric(14,2) DEFAULT 0 NOT NULL,
    tooling_cost_clp numeric(14,2) DEFAULT 0 NOT NULL,
    gross_margin_proxy_clp numeric(14,2) DEFAULT 0 NOT NULL,
    gross_margin_proxy_pct numeric(8,2),
    provider_tooling_snapshot_id text,
    source_compensation_version_id text,
    source_payroll_entry_id text,
    snapshot_status text DEFAULT 'partial'::text NOT NULL,
    refresh_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT staff_aug_placement_snapshots_snapshot_status_check CHECK ((snapshot_status = ANY (ARRAY['partial'::text, 'complete'::text])))
);


--
-- Name: user_360; Type: VIEW; Schema: greenhouse_serving; Owner: -
--

CREATE VIEW greenhouse_serving.user_360 AS
 SELECT u.user_id,
    u.public_id,
    u.email,
    u.full_name,
    u.tenant_type,
    u.auth_mode,
    u.status,
    u.active,
    u.last_login_at,
    u.client_id,
    c.client_name,
    u.identity_profile_id,
    ip.public_id AS identity_public_id,
    ip.full_name AS identity_full_name,
    ip.canonical_email AS identity_email,
    u.member_id,
    u.microsoft_oid,
    u.google_sub,
    u.avatar_url,
    COALESCE(u.timezone, 'America/Santiago'::text) AS timezone,
    COALESCE(array_agg(DISTINCT ura.role_code) FILTER (WHERE (ura.active AND (ura.role_code IS NOT NULL))), ARRAY[]::text[]) AS active_role_codes,
    u.created_at,
    u.updated_at
   FROM (((greenhouse_core.client_users u
     LEFT JOIN greenhouse_core.clients c ON ((c.client_id = u.client_id)))
     LEFT JOIN greenhouse_core.identity_profiles ip ON ((ip.profile_id = u.identity_profile_id)))
     LEFT JOIN greenhouse_core.user_role_assignments ura ON ((ura.user_id = u.user_id)))
  GROUP BY u.user_id, u.public_id, u.email, u.full_name, u.tenant_type, u.auth_mode, u.status, u.active, u.last_login_at, u.client_id, c.client_name, u.identity_profile_id, ip.public_id, ip.full_name, ip.canonical_email, u.member_id, u.microsoft_oid, u.google_sub, u.avatar_url, u.timezone, u.created_at, u.updated_at;


--
-- Name: identity_reconciliation_proposals; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.identity_reconciliation_proposals (
    proposal_id text NOT NULL,
    source_system text NOT NULL,
    source_object_type text NOT NULL,
    source_object_id text NOT NULL,
    source_display_name text,
    source_email text,
    discovered_in text NOT NULL,
    occurrence_count integer DEFAULT 1 NOT NULL,
    candidate_member_id text,
    candidate_profile_id text,
    candidate_display_name text,
    match_confidence numeric(3,2) DEFAULT 0.00 NOT NULL,
    match_signals jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    resolved_by text,
    resolved_at timestamp with time zone,
    resolution_note text,
    sync_run_id text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT identity_reconciliation_proposals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'auto_linked'::text, 'admin_approved'::text, 'admin_rejected'::text, 'dismissed'::text])))
);


--
-- Name: outbox_events; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.outbox_events (
    event_id text NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id text NOT NULL,
    event_type text NOT NULL,
    payload_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    occurred_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    published_at timestamp with time zone
);


--
-- Name: outbox_reactive_log; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.outbox_reactive_log (
    event_id text NOT NULL,
    reacted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    handler text NOT NULL,
    result text,
    retries integer DEFAULT 0 NOT NULL,
    last_error text
);


--
-- Name: projection_refresh_queue; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.projection_refresh_queue (
    refresh_id text NOT NULL,
    projection_name text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    triggered_by_event_id text,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.schema_migrations (
    migration_id text NOT NULL,
    migration_group text NOT NULL,
    applied_by text NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text
);


--
-- Name: service_sync_queue; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.service_sync_queue (
    queue_id text NOT NULL,
    service_id text NOT NULL,
    operation text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at timestamp with time zone,
    CONSTRAINT service_sync_queue_operation_check CHECK ((operation = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text]))),
    CONSTRAINT service_sync_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: source_sync_failures; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.source_sync_failures (
    sync_failure_id text NOT NULL,
    sync_run_id text,
    source_system text NOT NULL,
    source_object_type text NOT NULL,
    source_object_id text,
    error_code text,
    error_message text NOT NULL,
    payload_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    retryable boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at timestamp with time zone
);


--
-- Name: source_sync_runs; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.source_sync_runs (
    sync_run_id text NOT NULL,
    source_system text NOT NULL,
    source_object_type text NOT NULL,
    sync_mode text DEFAULT 'incremental'::text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    watermark_key text,
    watermark_start_value text,
    watermark_end_value text,
    records_read integer DEFAULT 0 NOT NULL,
    records_written_raw integer DEFAULT 0 NOT NULL,
    records_written_conformed integer DEFAULT 0 NOT NULL,
    records_projected_postgres integer DEFAULT 0 NOT NULL,
    triggered_by text,
    notes text,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT source_sync_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text, 'partial'::text, 'cancelled'::text])))
);


--
-- Name: source_sync_watermarks; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.source_sync_watermarks (
    watermark_id text NOT NULL,
    source_system text NOT NULL,
    source_object_type text NOT NULL,
    watermark_key text NOT NULL,
    watermark_value text,
    watermark_updated_at timestamp with time zone,
    sync_run_id text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: webhook_deliveries; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.webhook_deliveries (
    webhook_delivery_id text NOT NULL,
    event_id text NOT NULL,
    webhook_subscription_id text NOT NULL,
    event_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_retry_at timestamp with time zone,
    last_http_status integer,
    last_error_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT webhook_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'delivering'::text, 'succeeded'::text, 'retry_scheduled'::text, 'dead_letter'::text])))
);


--
-- Name: webhook_delivery_attempts; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.webhook_delivery_attempts (
    webhook_delivery_attempt_id text NOT NULL,
    webhook_delivery_id text NOT NULL,
    attempt_number integer NOT NULL,
    request_headers_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    request_body_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_status integer,
    response_body text,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at timestamp with time zone,
    error_message text
);


--
-- Name: webhook_endpoints; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.webhook_endpoints (
    webhook_endpoint_id text NOT NULL,
    endpoint_key text NOT NULL,
    provider_code text NOT NULL,
    handler_code text NOT NULL,
    auth_mode text DEFAULT 'shared_secret'::text NOT NULL,
    secret_ref text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT webhook_endpoints_auth_mode_check CHECK ((auth_mode = ANY (ARRAY['shared_secret'::text, 'hmac_sha256'::text, 'bearer'::text, 'provider_native'::text, 'none'::text])))
);


--
-- Name: webhook_inbox_events; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.webhook_inbox_events (
    webhook_inbox_event_id text NOT NULL,
    webhook_endpoint_id text NOT NULL,
    provider_code text NOT NULL,
    source_event_id text,
    idempotency_key text NOT NULL,
    headers_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    payload_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_body_text text,
    signature_verified boolean,
    status text DEFAULT 'received'::text NOT NULL,
    error_message text,
    received_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at timestamp with time zone,
    CONSTRAINT webhook_inbox_events_status_check CHECK ((status = ANY (ARRAY['received'::text, 'processing'::text, 'processed'::text, 'failed'::text, 'dead_letter'::text])))
);


--
-- Name: webhook_subscriptions; Type: TABLE; Schema: greenhouse_sync; Owner: -
--

CREATE TABLE greenhouse_sync.webhook_subscriptions (
    webhook_subscription_id text NOT NULL,
    subscriber_code text NOT NULL,
    target_url text NOT NULL,
    auth_mode text DEFAULT 'hmac_sha256'::text NOT NULL,
    secret_ref text,
    event_filters_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    paused_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT webhook_subscriptions_auth_mode_check CHECK ((auth_mode = ANY (ARRAY['hmac_sha256'::text, 'bearer'::text, 'none'::text])))
);


--
-- Name: pgmigrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pgmigrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pgmigrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pgmigrations_id_seq OWNED BY public.pgmigrations.id;


--
-- Name: pgmigrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pgmigrations ALTER COLUMN id SET DEFAULT nextval('public.pgmigrations_id_seq'::regclass);


--
-- Name: credit_ledger credit_ledger_pkey; Type: CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.credit_ledger
    ADD CONSTRAINT credit_ledger_pkey PRIMARY KEY (ledger_id);


--
-- Name: credit_wallets credit_wallets_pkey; Type: CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.credit_wallets
    ADD CONSTRAINT credit_wallets_pkey PRIMARY KEY (wallet_id);


--
-- Name: member_tool_licenses member_tool_licenses_pkey; Type: CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.member_tool_licenses
    ADD CONSTRAINT member_tool_licenses_pkey PRIMARY KEY (license_id);


--
-- Name: nexa_feedback nexa_feedback_pkey; Type: CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.nexa_feedback
    ADD CONSTRAINT nexa_feedback_pkey PRIMARY KEY (feedback_id);


--
-- Name: nexa_messages nexa_messages_pkey; Type: CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.nexa_messages
    ADD CONSTRAINT nexa_messages_pkey PRIMARY KEY (message_id);


--
-- Name: nexa_threads nexa_threads_pkey; Type: CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.nexa_threads
    ADD CONSTRAINT nexa_threads_pkey PRIMARY KEY (thread_id);


--
-- Name: tool_catalog tool_catalog_pkey; Type: CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.tool_catalog
    ADD CONSTRAINT tool_catalog_pkey PRIMARY KEY (tool_id);


--
-- Name: nexa_feedback uq_nexa_feedback_response_user; Type: CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.nexa_feedback
    ADD CONSTRAINT uq_nexa_feedback_response_user UNIQUE (response_id, user_id);


--
-- Name: asset_access_log asset_access_log_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.asset_access_log
    ADD CONSTRAINT asset_access_log_pkey PRIMARY KEY (access_log_id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (asset_id);


--
-- Name: assets assets_public_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.assets
    ADD CONSTRAINT assets_public_id_key UNIQUE (public_id);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (event_id);


--
-- Name: auth_tokens auth_tokens_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.auth_tokens
    ADD CONSTRAINT auth_tokens_pkey PRIMARY KEY (token_id);


--
-- Name: business_line_metadata business_line_metadata_hubspot_enum_value_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.business_line_metadata
    ADD CONSTRAINT business_line_metadata_hubspot_enum_value_key UNIQUE (hubspot_enum_value);


--
-- Name: business_line_metadata business_line_metadata_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.business_line_metadata
    ADD CONSTRAINT business_line_metadata_pkey PRIMARY KEY (module_code);


--
-- Name: campaign_project_links campaign_project_links_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.campaign_project_links
    ADD CONSTRAINT campaign_project_links_pkey PRIMARY KEY (campaign_project_link_id);


--
-- Name: campaigns campaigns_eo_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.campaigns
    ADD CONSTRAINT campaigns_eo_id_key UNIQUE (eo_id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (campaign_id);


--
-- Name: campaigns campaigns_slug_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.campaigns
    ADD CONSTRAINT campaigns_slug_key UNIQUE (slug);


--
-- Name: client_feature_flags client_feature_flags_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_feature_flags
    ADD CONSTRAINT client_feature_flags_pkey PRIMARY KEY (flag_id);


--
-- Name: client_feature_flags client_feature_flags_unique; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_feature_flags
    ADD CONSTRAINT client_feature_flags_unique UNIQUE (client_id, flag_code);


--
-- Name: client_service_modules client_service_modules_client_module_unique; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_service_modules
    ADD CONSTRAINT client_service_modules_client_module_unique UNIQUE (client_id, module_id);


--
-- Name: client_service_modules client_service_modules_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_service_modules
    ADD CONSTRAINT client_service_modules_pkey PRIMARY KEY (assignment_id);


--
-- Name: client_team_assignments client_team_assignments_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_team_assignments
    ADD CONSTRAINT client_team_assignments_pkey PRIMARY KEY (assignment_id);


--
-- Name: client_users client_users_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_users
    ADD CONSTRAINT client_users_pkey PRIMARY KEY (user_id);


--
-- Name: client_users client_users_public_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_users
    ADD CONSTRAINT client_users_public_id_key UNIQUE (public_id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (client_id);


--
-- Name: clients clients_public_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.clients
    ADD CONSTRAINT clients_public_id_key UNIQUE (public_id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (department_id);


--
-- Name: entity_source_links entity_source_links_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.entity_source_links
    ADD CONSTRAINT entity_source_links_pkey PRIMARY KEY (link_id);


--
-- Name: entity_source_links entity_source_links_unique; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.entity_source_links
    ADD CONSTRAINT entity_source_links_unique UNIQUE (entity_type, entity_id, source_system, source_object_type, source_object_id);


--
-- Name: assets greenhouse_assets_unique_object; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.assets
    ADD CONSTRAINT greenhouse_assets_unique_object UNIQUE (bucket_name, object_path);


--
-- Name: identity_profile_source_links identity_profile_source_links_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.identity_profile_source_links
    ADD CONSTRAINT identity_profile_source_links_pkey PRIMARY KEY (link_id);


--
-- Name: identity_profile_source_links identity_profile_source_links_unique; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.identity_profile_source_links
    ADD CONSTRAINT identity_profile_source_links_unique UNIQUE (profile_id, source_system, source_object_type, source_object_id);


--
-- Name: identity_profiles identity_profiles_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.identity_profiles
    ADD CONSTRAINT identity_profiles_pkey PRIMARY KEY (profile_id);


--
-- Name: identity_profiles identity_profiles_public_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.identity_profiles
    ADD CONSTRAINT identity_profiles_public_id_key UNIQUE (public_id);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (member_id);


--
-- Name: members members_public_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.members
    ADD CONSTRAINT members_public_id_key UNIQUE (public_id);


--
-- Name: reporting_lines reporting_lines_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.reporting_lines
    ADD CONSTRAINT reporting_lines_pkey PRIMARY KEY (reporting_line_id);


--
-- Name: reporting_lines reporting_lines_no_overlap; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.reporting_lines
    ADD CONSTRAINT reporting_lines_no_overlap EXCLUDE USING gist (member_id WITH =, tstzrange(effective_from, COALESCE(effective_to, 'infinity'::timestamp with time zone), '[)'::text) WITH &&);


--
-- Name: notion_workspace_source_bindings notion_workspace_source_bindings_unique; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.notion_workspace_source_bindings
    ADD CONSTRAINT notion_workspace_source_bindings_unique UNIQUE (space_id, source_system, source_object_type, source_object_id, binding_role);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (organization_id);


--
-- Name: organizations organizations_public_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.organizations
    ADD CONSTRAINT organizations_public_id_key UNIQUE (public_id);


--
-- Name: person_memberships person_memberships_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.person_memberships
    ADD CONSTRAINT person_memberships_pkey PRIMARY KEY (membership_id);


--
-- Name: person_memberships person_memberships_public_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.person_memberships
    ADD CONSTRAINT person_memberships_public_id_key UNIQUE (public_id);


--
-- Name: providers providers_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.providers
    ADD CONSTRAINT providers_pkey PRIMARY KEY (provider_id);


--
-- Name: providers providers_public_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.providers
    ADD CONSTRAINT providers_public_id_key UNIQUE (public_id);


--
-- Name: role_view_assignments role_view_assignments_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.role_view_assignments
    ADD CONSTRAINT role_view_assignments_pkey PRIMARY KEY (role_code, view_code);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_code);


--
-- Name: service_history service_history_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.service_history
    ADD CONSTRAINT service_history_pkey PRIMARY KEY (history_id);


--
-- Name: service_modules service_modules_module_code_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.service_modules
    ADD CONSTRAINT service_modules_module_code_key UNIQUE (module_code);


--
-- Name: service_modules service_modules_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.service_modules
    ADD CONSTRAINT service_modules_pkey PRIMARY KEY (module_id);


--
-- Name: services services_hubspot_service_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.services
    ADD CONSTRAINT services_hubspot_service_id_key UNIQUE (hubspot_service_id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (service_id);


--
-- Name: services services_public_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.services
    ADD CONSTRAINT services_public_id_key UNIQUE (public_id);


--
-- Name: space_notion_sources space_notion_sources_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.space_notion_sources
    ADD CONSTRAINT space_notion_sources_pkey PRIMARY KEY (source_id);


--
-- Name: space_notion_sources space_notion_sources_space_unique; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.space_notion_sources
    ADD CONSTRAINT space_notion_sources_space_unique UNIQUE (space_id);


--
-- Name: notion_workspace_source_bindings space_source_bindings_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.notion_workspace_source_bindings
    ADD CONSTRAINT space_source_bindings_pkey PRIMARY KEY (binding_id);


--
-- Name: notion_workspaces spaces_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.notion_workspaces
    ADD CONSTRAINT spaces_pkey PRIMARY KEY (space_id);


--
-- Name: spaces spaces_pkey1; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.spaces
    ADD CONSTRAINT spaces_pkey1 PRIMARY KEY (space_id);


--
-- Name: notion_workspaces spaces_public_id_key; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.notion_workspaces
    ADD CONSTRAINT spaces_public_id_key UNIQUE (public_id);


--
-- Name: spaces spaces_public_id_key1; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.spaces
    ADD CONSTRAINT spaces_public_id_key1 UNIQUE (public_id);


--
-- Name: campaign_project_links uq_campaign_project_space; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.campaign_project_links
    ADD CONSTRAINT uq_campaign_project_space UNIQUE (space_id, project_source_id);


--
-- Name: user_campaign_scopes user_campaign_scopes_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_campaign_scopes
    ADD CONSTRAINT user_campaign_scopes_pkey PRIMARY KEY (scope_id);


--
-- Name: user_client_scopes user_client_scopes_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_client_scopes
    ADD CONSTRAINT user_client_scopes_pkey PRIMARY KEY (scope_id);


--
-- Name: user_project_scopes user_project_scopes_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_project_scopes
    ADD CONSTRAINT user_project_scopes_pkey PRIMARY KEY (scope_id);


--
-- Name: user_role_assignments user_role_assignments_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_role_assignments
    ADD CONSTRAINT user_role_assignments_pkey PRIMARY KEY (assignment_id);


--
-- Name: user_view_overrides user_view_overrides_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_view_overrides
    ADD CONSTRAINT user_view_overrides_pkey PRIMARY KEY (user_id, view_code);


--
-- Name: view_access_log view_access_log_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.view_access_log
    ADD CONSTRAINT view_access_log_pkey PRIMARY KEY (log_id);


--
-- Name: view_registry view_registry_pkey; Type: CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.view_registry
    ADD CONSTRAINT view_registry_pkey PRIMARY KEY (view_code);


--
-- Name: period_closure_config period_closure_config_pkey; Type: CONSTRAINT; Schema: greenhouse_cost_intelligence; Owner: -
--

ALTER TABLE ONLY greenhouse_cost_intelligence.period_closure_config
    ADD CONSTRAINT period_closure_config_pkey PRIMARY KEY (config_id);


--
-- Name: period_closures period_closures_pkey; Type: CONSTRAINT; Schema: greenhouse_cost_intelligence; Owner: -
--

ALTER TABLE ONLY greenhouse_cost_intelligence.period_closures
    ADD CONSTRAINT period_closures_pkey PRIMARY KEY (period_year, period_month);


--
-- Name: companies companies_hubspot_company_id_key; Type: CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.companies
    ADD CONSTRAINT companies_hubspot_company_id_key UNIQUE (hubspot_company_id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (company_record_id);


--
-- Name: contacts contacts_hubspot_contact_id_key; Type: CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.contacts
    ADD CONSTRAINT contacts_hubspot_contact_id_key UNIQUE (hubspot_contact_id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (contact_record_id);


--
-- Name: deals deals_hubspot_deal_id_key; Type: CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.deals
    ADD CONSTRAINT deals_hubspot_deal_id_key UNIQUE (hubspot_deal_id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (deal_record_id);


--
-- Name: projects projects_notion_project_id_key; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.projects
    ADD CONSTRAINT projects_notion_project_id_key UNIQUE (notion_project_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (project_record_id);


--
-- Name: space_property_mappings space_property_mappings_pkey; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.space_property_mappings
    ADD CONSTRAINT space_property_mappings_pkey PRIMARY KEY (id);


--
-- Name: space_property_mappings spm_space_conformed_uq; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.space_property_mappings
    ADD CONSTRAINT spm_space_conformed_uq UNIQUE (space_id, conformed_field_name);


--
-- Name: space_property_mappings spm_space_notion_uq; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.space_property_mappings
    ADD CONSTRAINT spm_space_notion_uq UNIQUE (space_id, notion_property_name);


--
-- Name: sprints sprints_notion_sprint_id_key; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.sprints
    ADD CONSTRAINT sprints_notion_sprint_id_key UNIQUE (notion_sprint_id);


--
-- Name: sprints sprints_pkey; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.sprints
    ADD CONSTRAINT sprints_pkey PRIMARY KEY (sprint_record_id);


--
-- Name: staff_aug_events staff_aug_events_pkey; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_events
    ADD CONSTRAINT staff_aug_events_pkey PRIMARY KEY (staff_aug_event_id);


--
-- Name: staff_aug_onboarding_items staff_aug_onboarding_items_pkey; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_onboarding_items
    ADD CONSTRAINT staff_aug_onboarding_items_pkey PRIMARY KEY (onboarding_item_id);


--
-- Name: staff_aug_onboarding_items staff_aug_onboarding_items_placement_id_item_key_key; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_onboarding_items
    ADD CONSTRAINT staff_aug_onboarding_items_placement_id_item_key_key UNIQUE (placement_id, item_key);


--
-- Name: staff_aug_placements staff_aug_placements_assignment_id_key; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_assignment_id_key UNIQUE (assignment_id);


--
-- Name: staff_aug_placements staff_aug_placements_pkey; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_pkey PRIMARY KEY (placement_id);


--
-- Name: staff_aug_placements staff_aug_placements_public_id_key; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_public_id_key UNIQUE (public_id);


--
-- Name: tasks tasks_notion_task_id_key; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.tasks
    ADD CONSTRAINT tasks_notion_task_id_key UNIQUE (notion_task_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (task_record_id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (account_id);


--
-- Name: bank_statement_rows bank_statement_rows_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.bank_statement_rows
    ADD CONSTRAINT bank_statement_rows_pkey PRIMARY KEY (row_id);


--
-- Name: client_economics client_economics_client_id_period_year_period_month_key; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.client_economics
    ADD CONSTRAINT client_economics_client_id_period_year_period_month_key UNIQUE (client_id, period_year, period_month);


--
-- Name: client_economics client_economics_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.client_economics
    ADD CONSTRAINT client_economics_pkey PRIMARY KEY (snapshot_id);


--
-- Name: client_profiles client_profiles_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.client_profiles
    ADD CONSTRAINT client_profiles_pkey PRIMARY KEY (client_profile_id);


--
-- Name: cost_allocations cost_allocations_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.cost_allocations
    ADD CONSTRAINT cost_allocations_pkey PRIMARY KEY (allocation_id);


--
-- Name: economic_indicators economic_indicators_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.economic_indicators
    ADD CONSTRAINT economic_indicators_pkey PRIMARY KEY (indicator_id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (rate_id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (expense_id);


--
-- Name: factoring_operations factoring_operations_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.factoring_operations
    ADD CONSTRAINT factoring_operations_pkey PRIMARY KEY (operation_id);


--
-- Name: economic_indicators finance_economic_indicators_unique_key; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.economic_indicators
    ADD CONSTRAINT finance_economic_indicators_unique_key UNIQUE (indicator_code, indicator_date);


--
-- Name: exchange_rates finance_exchange_rates_unique_pair; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.exchange_rates
    ADD CONSTRAINT finance_exchange_rates_unique_pair UNIQUE (from_currency, to_currency, rate_date);


--
-- Name: service_entry_sheets hes_number_client_unique; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.service_entry_sheets
    ADD CONSTRAINT hes_number_client_unique UNIQUE (hes_number, client_id);


--
-- Name: income_line_items income_line_items_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income_line_items
    ADD CONSTRAINT income_line_items_pkey PRIMARY KEY (line_item_id);


--
-- Name: income_payments income_payments_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income_payments
    ADD CONSTRAINT income_payments_pkey PRIMARY KEY (payment_id);


--
-- Name: income income_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income
    ADD CONSTRAINT income_pkey PRIMARY KEY (income_id);


--
-- Name: income_line_items line_item_unique; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income_line_items
    ADD CONSTRAINT line_item_unique UNIQUE (income_id, line_number);


--
-- Name: nubox_emission_log nubox_emission_log_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.nubox_emission_log
    ADD CONSTRAINT nubox_emission_log_pkey PRIMARY KEY (log_id);


--
-- Name: purchase_orders po_number_client_unique; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.purchase_orders
    ADD CONSTRAINT po_number_client_unique UNIQUE (po_number, client_id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (po_id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (quote_id);


--
-- Name: reconciliation_periods reconciliation_periods_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.reconciliation_periods
    ADD CONSTRAINT reconciliation_periods_pkey PRIMARY KEY (period_id);


--
-- Name: reconciliation_periods reconciliation_periods_unique; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.reconciliation_periods
    ADD CONSTRAINT reconciliation_periods_unique UNIQUE (account_id, year, month);


--
-- Name: service_entry_sheets service_entry_sheets_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.service_entry_sheets
    ADD CONSTRAINT service_entry_sheets_pkey PRIMARY KEY (hes_id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (supplier_id);


--
-- Name: leave_balances leave_balances_member_type_year_unique; Type: CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_balances
    ADD CONSTRAINT leave_balances_member_type_year_unique UNIQUE (member_id, leave_type_code, year);


--
-- Name: leave_balances leave_balances_pkey; Type: CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_balances
    ADD CONSTRAINT leave_balances_pkey PRIMARY KEY (balance_id);


--
-- Name: leave_policies leave_policies_pkey; Type: CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_policies
    ADD CONSTRAINT leave_policies_pkey PRIMARY KEY (policy_id);


--
-- Name: leave_request_actions leave_request_actions_pkey; Type: CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_request_actions
    ADD CONSTRAINT leave_request_actions_pkey PRIMARY KEY (action_id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (request_id);


--
-- Name: workflow_approval_snapshots workflow_approval_snapshots_pkey; Type: CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.workflow_approval_snapshots
    ADD CONSTRAINT workflow_approval_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (leave_type_code);


--
-- Name: email_deliveries email_deliveries_pkey; Type: CONSTRAINT; Schema: greenhouse_notifications; Owner: -
--

ALTER TABLE ONLY greenhouse_notifications.email_deliveries
    ADD CONSTRAINT email_deliveries_pkey PRIMARY KEY (delivery_id);


--
-- Name: email_subscriptions email_subscriptions_pkey; Type: CONSTRAINT; Schema: greenhouse_notifications; Owner: -
--

ALTER TABLE ONLY greenhouse_notifications.email_subscriptions
    ADD CONSTRAINT email_subscriptions_pkey PRIMARY KEY (subscription_id);


--
-- Name: notification_log notification_log_pkey; Type: CONSTRAINT; Schema: greenhouse_notifications; Owner: -
--

ALTER TABLE ONLY greenhouse_notifications.notification_log
    ADD CONSTRAINT notification_log_pkey PRIMARY KEY (log_id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: greenhouse_notifications; Owner: -
--

ALTER TABLE ONLY greenhouse_notifications.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (preference_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: greenhouse_notifications; Owner: -
--

ALTER TABLE ONLY greenhouse_notifications.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: email_subscriptions uq_email_subscription; Type: CONSTRAINT; Schema: greenhouse_notifications; Owner: -
--

ALTER TABLE ONLY greenhouse_notifications.email_subscriptions
    ADD CONSTRAINT uq_email_subscription UNIQUE (email_type, recipient_email);


--
-- Name: notification_preferences uq_notif_pref_user_category; Type: CONSTRAINT; Schema: greenhouse_notifications; Owner: -
--

ALTER TABLE ONLY greenhouse_notifications.notification_preferences
    ADD CONSTRAINT uq_notif_pref_user_category UNIQUE (user_id, category);


--
-- Name: attendance_monthly_snapshot attendance_monthly_snapshot_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.attendance_monthly_snapshot
    ADD CONSTRAINT attendance_monthly_snapshot_pkey PRIMARY KEY (member_id, period_year, period_month);


--
-- Name: chile_afp_rates chile_afp_rates_period_name_unique; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.chile_afp_rates
    ADD CONSTRAINT chile_afp_rates_period_name_unique UNIQUE (period_year, period_month, afp_name);


--
-- Name: chile_afp_rates chile_afp_rates_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.chile_afp_rates
    ADD CONSTRAINT chile_afp_rates_pkey PRIMARY KEY (afp_rate_id);


--
-- Name: chile_previred_indicators chile_previred_indicators_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.chile_previred_indicators
    ADD CONSTRAINT chile_previred_indicators_pkey PRIMARY KEY (period_year, period_month);


--
-- Name: chile_tax_brackets chile_tax_brackets_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.chile_tax_brackets
    ADD CONSTRAINT chile_tax_brackets_pkey PRIMARY KEY (bracket_id);


--
-- Name: compensation_versions compensation_member_effective_unique; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.compensation_versions
    ADD CONSTRAINT compensation_member_effective_unique UNIQUE (member_id, effective_from);


--
-- Name: compensation_versions compensation_versions_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.compensation_versions
    ADD CONSTRAINT compensation_versions_pkey PRIMARY KEY (version_id);


--
-- Name: payroll_bonus_config payroll_bonus_config_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_bonus_config
    ADD CONSTRAINT payroll_bonus_config_pkey PRIMARY KEY (config_id, effective_from);


--
-- Name: payroll_entries payroll_entries_period_member_unique; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_entries
    ADD CONSTRAINT payroll_entries_period_member_unique UNIQUE (period_id, member_id);


--
-- Name: payroll_entries payroll_entries_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_entries
    ADD CONSTRAINT payroll_entries_pkey PRIMARY KEY (entry_id);


--
-- Name: payroll_export_packages payroll_export_packages_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_export_packages
    ADD CONSTRAINT payroll_export_packages_pkey PRIMARY KEY (period_id);


--
-- Name: payroll_periods payroll_periods_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_periods
    ADD CONSTRAINT payroll_periods_pkey PRIMARY KEY (period_id);


--
-- Name: payroll_periods payroll_periods_year_month_unique; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_periods
    ADD CONSTRAINT payroll_periods_year_month_unique UNIQUE (year, month);


--
-- Name: payroll_receipts payroll_receipts_entry_revision_unique; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_receipts
    ADD CONSTRAINT payroll_receipts_entry_revision_unique UNIQUE (entry_id, revision);


--
-- Name: payroll_receipts payroll_receipts_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_receipts
    ADD CONSTRAINT payroll_receipts_pkey PRIMARY KEY (receipt_id);


--
-- Name: payroll_receipts payroll_receipts_source_event_entry_unique; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_receipts
    ADD CONSTRAINT payroll_receipts_source_event_entry_unique UNIQUE (source_event_id, entry_id);


--
-- Name: previred_afp_rates previred_afp_rates_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.previred_afp_rates
    ADD CONSTRAINT previred_afp_rates_pkey PRIMARY KEY (indicator_id);


--
-- Name: previred_afp_rates previred_afp_rates_unique; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.previred_afp_rates
    ADD CONSTRAINT previred_afp_rates_unique UNIQUE (indicator_date, afp_code);


--
-- Name: previred_period_indicators previred_period_indicators_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.previred_period_indicators
    ADD CONSTRAINT previred_period_indicators_pkey PRIMARY KEY (indicator_id);


--
-- Name: previred_period_indicators previred_period_indicators_unique; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.previred_period_indicators
    ADD CONSTRAINT previred_period_indicators_unique UNIQUE (indicator_date);


--
-- Name: projected_payroll_promotions projected_payroll_promotions_pkey; Type: CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.projected_payroll_promotions
    ADD CONSTRAINT projected_payroll_promotions_pkey PRIMARY KEY (promotion_id);


--
-- Name: commercial_cost_attribution commercial_cost_attribution_pkey; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.commercial_cost_attribution
    ADD CONSTRAINT commercial_cost_attribution_pkey PRIMARY KEY (member_id, client_id, period_year, period_month);


--
-- Name: ico_member_metrics ico_member_metrics_pkey; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.ico_member_metrics
    ADD CONSTRAINT ico_member_metrics_pkey PRIMARY KEY (member_id, period_year, period_month);


--
-- Name: ico_organization_metrics ico_organization_metrics_pkey; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.ico_organization_metrics
    ADD CONSTRAINT ico_organization_metrics_pkey PRIMARY KEY (organization_id, period_year, period_month);


--
-- Name: member_capacity_economics member_capacity_economics_pkey; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.member_capacity_economics
    ADD CONSTRAINT member_capacity_economics_pkey PRIMARY KEY (member_id, period_year, period_month);


--
-- Name: metric_threshold_overrides metric_threshold_overrides_organization_id_metric_code_key; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.metric_threshold_overrides
    ADD CONSTRAINT metric_threshold_overrides_organization_id_metric_code_key UNIQUE (organization_id, metric_code);


--
-- Name: metric_threshold_overrides metric_threshold_overrides_pkey; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.metric_threshold_overrides
    ADD CONSTRAINT metric_threshold_overrides_pkey PRIMARY KEY (override_id);


--
-- Name: operational_pl_snapshots operational_pl_snapshots_pkey; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.operational_pl_snapshots
    ADD CONSTRAINT operational_pl_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: operational_pl_snapshots operational_pl_snapshots_scope_type_scope_id_period_year_pe_key; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.operational_pl_snapshots
    ADD CONSTRAINT operational_pl_snapshots_scope_type_scope_id_period_year_pe_key UNIQUE (scope_type, scope_id, period_year, period_month, snapshot_revision);


--
-- Name: organization_operational_metrics organization_operational_metrics_pkey; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.organization_operational_metrics
    ADD CONSTRAINT organization_operational_metrics_pkey PRIMARY KEY (organization_id, period_year, period_month);


--
-- Name: period_closure_status period_closure_status_pkey; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.period_closure_status
    ADD CONSTRAINT period_closure_status_pkey PRIMARY KEY (period_year, period_month);


--
-- Name: person_operational_360 person_operational_360_pkey; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.person_operational_360
    ADD CONSTRAINT person_operational_360_pkey PRIMARY KEY (member_id, period_year, period_month);


--
-- Name: projected_payroll_snapshots projected_payroll_snapshots_pkey; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.projected_payroll_snapshots
    ADD CONSTRAINT projected_payroll_snapshots_pkey PRIMARY KEY (member_id, period_year, period_month, projection_mode);


--
-- Name: staff_aug_placement_snapshots staff_aug_placement_snapshots_pkey; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.staff_aug_placement_snapshots
    ADD CONSTRAINT staff_aug_placement_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: staff_aug_placement_snapshots staff_aug_placement_snapshots_placement_id_period_year_peri_key; Type: CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.staff_aug_placement_snapshots
    ADD CONSTRAINT staff_aug_placement_snapshots_placement_id_period_year_peri_key UNIQUE (placement_id, period_year, period_month);


--
-- Name: identity_reconciliation_proposals identity_reconciliation_proposals_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.identity_reconciliation_proposals
    ADD CONSTRAINT identity_reconciliation_proposals_pkey PRIMARY KEY (proposal_id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (event_id);


--
-- Name: outbox_reactive_log outbox_reactive_log_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.outbox_reactive_log
    ADD CONSTRAINT outbox_reactive_log_pkey PRIMARY KEY (event_id, handler);


--
-- Name: projection_refresh_queue projection_refresh_queue_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.projection_refresh_queue
    ADD CONSTRAINT projection_refresh_queue_pkey PRIMARY KEY (refresh_id);


--
-- Name: projection_refresh_queue projection_refresh_queue_projection_entity_unique; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.projection_refresh_queue
    ADD CONSTRAINT projection_refresh_queue_projection_entity_unique UNIQUE (projection_name, entity_type, entity_id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (migration_id);


--
-- Name: service_sync_queue service_sync_queue_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.service_sync_queue
    ADD CONSTRAINT service_sync_queue_pkey PRIMARY KEY (queue_id);


--
-- Name: source_sync_failures source_sync_failures_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.source_sync_failures
    ADD CONSTRAINT source_sync_failures_pkey PRIMARY KEY (sync_failure_id);


--
-- Name: source_sync_runs source_sync_runs_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.source_sync_runs
    ADD CONSTRAINT source_sync_runs_pkey PRIMARY KEY (sync_run_id);


--
-- Name: source_sync_watermarks source_sync_watermarks_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.source_sync_watermarks
    ADD CONSTRAINT source_sync_watermarks_pkey PRIMARY KEY (watermark_id);


--
-- Name: source_sync_watermarks source_sync_watermarks_unique; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.source_sync_watermarks
    ADD CONSTRAINT source_sync_watermarks_unique UNIQUE (source_system, source_object_type, watermark_key);


--
-- Name: webhook_deliveries webhook_deliveries_dedupe; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_dedupe UNIQUE (event_id, webhook_subscription_id);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (webhook_delivery_id);


--
-- Name: webhook_delivery_attempts webhook_delivery_attempts_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.webhook_delivery_attempts
    ADD CONSTRAINT webhook_delivery_attempts_pkey PRIMARY KEY (webhook_delivery_attempt_id);


--
-- Name: webhook_endpoints webhook_endpoints_endpoint_key_key; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_endpoint_key_key UNIQUE (endpoint_key);


--
-- Name: webhook_endpoints webhook_endpoints_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (webhook_endpoint_id);


--
-- Name: webhook_inbox_events webhook_inbox_events_idempotency; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.webhook_inbox_events
    ADD CONSTRAINT webhook_inbox_events_idempotency UNIQUE (webhook_endpoint_id, idempotency_key);


--
-- Name: webhook_inbox_events webhook_inbox_events_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.webhook_inbox_events
    ADD CONSTRAINT webhook_inbox_events_pkey PRIMARY KEY (webhook_inbox_event_id);


--
-- Name: webhook_subscriptions webhook_subscriptions_pkey; Type: CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_pkey PRIMARY KEY (webhook_subscription_id);


--
-- Name: pgmigrations pgmigrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pgmigrations
    ADD CONSTRAINT pgmigrations_pkey PRIMARY KEY (id);


--
-- Name: greenhouse_ai_credit_ledger_member_idx; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE INDEX greenhouse_ai_credit_ledger_member_idx ON greenhouse_ai.credit_ledger USING btree (consumed_by_member_id, created_at DESC);


--
-- Name: greenhouse_ai_credit_ledger_request_idx; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE UNIQUE INDEX greenhouse_ai_credit_ledger_request_idx ON greenhouse_ai.credit_ledger USING btree (wallet_id, request_id, entry_type) WHERE (request_id IS NOT NULL);


--
-- Name: greenhouse_ai_credit_ledger_wallet_idx; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE INDEX greenhouse_ai_credit_ledger_wallet_idx ON greenhouse_ai.credit_ledger USING btree (wallet_id, created_at DESC);


--
-- Name: greenhouse_ai_credit_wallets_client_idx; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE INDEX greenhouse_ai_credit_wallets_client_idx ON greenhouse_ai.credit_wallets USING btree (client_id, wallet_status);


--
-- Name: greenhouse_ai_credit_wallets_tool_idx; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE INDEX greenhouse_ai_credit_wallets_tool_idx ON greenhouse_ai.credit_wallets USING btree (tool_id, wallet_status);


--
-- Name: greenhouse_ai_member_tool_licenses_member_idx; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE INDEX greenhouse_ai_member_tool_licenses_member_idx ON greenhouse_ai.member_tool_licenses USING btree (member_id, license_status);


--
-- Name: greenhouse_ai_member_tool_licenses_tool_idx; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE INDEX greenhouse_ai_member_tool_licenses_tool_idx ON greenhouse_ai.member_tool_licenses USING btree (tool_id, license_status);


--
-- Name: greenhouse_ai_tool_catalog_active_idx; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE INDEX greenhouse_ai_tool_catalog_active_idx ON greenhouse_ai.tool_catalog USING btree (is_active, tool_category, sort_order, tool_name);


--
-- Name: greenhouse_ai_tool_catalog_provider_idx; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE INDEX greenhouse_ai_tool_catalog_provider_idx ON greenhouse_ai.tool_catalog USING btree (provider_id);


--
-- Name: idx_nexa_feedback_user; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE INDEX idx_nexa_feedback_user ON greenhouse_ai.nexa_feedback USING btree (user_id, client_id, created_at DESC);


--
-- Name: idx_nexa_messages_thread; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE INDEX idx_nexa_messages_thread ON greenhouse_ai.nexa_messages USING btree (thread_id, created_at);


--
-- Name: idx_nexa_threads_user; Type: INDEX; Schema: greenhouse_ai; Owner: -
--

CREATE INDEX idx_nexa_threads_user ON greenhouse_ai.nexa_threads USING btree (user_id, client_id, last_message_at DESC);


--
-- Name: audit_events_actor_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX audit_events_actor_idx ON greenhouse_core.audit_events USING btree (actor_user_id, created_at DESC);


--
-- Name: audit_events_target_user_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX audit_events_target_user_idx ON greenhouse_core.audit_events USING btree (target_user_id, created_at DESC);


--
-- Name: audit_events_type_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX audit_events_type_idx ON greenhouse_core.audit_events USING btree (event_type, created_at DESC);


--
-- Name: client_assignments_client_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX client_assignments_client_idx ON greenhouse_core.client_team_assignments USING btree (client_id) WHERE (active = true);


--
-- Name: client_assignments_member_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX client_assignments_member_idx ON greenhouse_core.client_team_assignments USING btree (member_id) WHERE (active = true);


--
-- Name: client_feature_flags_client_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX client_feature_flags_client_idx ON greenhouse_core.client_feature_flags USING btree (client_id) WHERE (enabled = true);


--
-- Name: client_service_modules_client_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX client_service_modules_client_idx ON greenhouse_core.client_service_modules USING btree (client_id);


--
-- Name: client_service_modules_module_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX client_service_modules_module_idx ON greenhouse_core.client_service_modules USING btree (module_id);


--
-- Name: client_users_client_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX client_users_client_idx ON greenhouse_core.client_users USING btree (client_id);


--
-- Name: client_users_email_lower_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX client_users_email_lower_idx ON greenhouse_core.client_users USING btree (lower(email));


--
-- Name: client_users_google_sub_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE UNIQUE INDEX client_users_google_sub_idx ON greenhouse_core.client_users USING btree (google_sub) WHERE (google_sub IS NOT NULL);


--
-- Name: client_users_identity_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX client_users_identity_idx ON greenhouse_core.client_users USING btree (identity_profile_id);


--
-- Name: client_users_member_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX client_users_member_idx ON greenhouse_core.client_users USING btree (member_id) WHERE (member_id IS NOT NULL);


--
-- Name: client_users_microsoft_oid_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE UNIQUE INDEX client_users_microsoft_oid_idx ON greenhouse_core.client_users USING btree (microsoft_oid) WHERE (microsoft_oid IS NOT NULL);


--
-- Name: greenhouse_asset_access_log_asset_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX greenhouse_asset_access_log_asset_idx ON greenhouse_core.asset_access_log USING btree (asset_id, occurred_at DESC);


--
-- Name: greenhouse_assets_owner_lookup_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX greenhouse_assets_owner_lookup_idx ON greenhouse_core.assets USING btree (owner_aggregate_type, owner_aggregate_id);


--
-- Name: greenhouse_assets_scope_lookup_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX greenhouse_assets_scope_lookup_idx ON greenhouse_core.assets USING btree (owner_client_id, owner_space_id, owner_member_id);


--
-- Name: greenhouse_assets_status_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX greenhouse_assets_status_idx ON greenhouse_core.assets USING btree (status, owner_aggregate_type, created_at DESC);


--
-- Name: identity_profile_source_links_profile_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX identity_profile_source_links_profile_idx ON greenhouse_core.identity_profile_source_links USING btree (profile_id);


--
-- Name: idx_auth_tokens_email_type; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_auth_tokens_email_type ON greenhouse_core.auth_tokens USING btree (email, token_type);


--
-- Name: idx_auth_tokens_hash; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_auth_tokens_hash ON greenhouse_core.auth_tokens USING btree (token_hash);


--
-- Name: idx_campaign_project_links_campaign_id; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_campaign_project_links_campaign_id ON greenhouse_core.campaign_project_links USING btree (campaign_id);


--
-- Name: idx_campaign_project_links_space_project; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_campaign_project_links_space_project ON greenhouse_core.campaign_project_links USING btree (space_id, project_source_id);


--
-- Name: idx_campaigns_owner_user_id; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_campaigns_owner_user_id ON greenhouse_core.campaigns USING btree (owner_user_id);


--
-- Name: idx_campaigns_space_id; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_campaigns_space_id ON greenhouse_core.campaigns USING btree (space_id);


--
-- Name: idx_campaigns_status; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_campaigns_status ON greenhouse_core.campaigns USING btree (status);


--
-- Name: idx_campaigns_type; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_campaigns_type ON greenhouse_core.campaigns USING btree (campaign_type);


--
-- Name: idx_clients_hubspot_company_id; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_clients_hubspot_company_id ON greenhouse_core.clients USING btree (hubspot_company_id) WHERE (hubspot_company_id IS NOT NULL);


--
-- Name: idx_role_view_assignments_role_code; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_role_view_assignments_role_code ON greenhouse_core.role_view_assignments USING btree (role_code, granted_at DESC);


--
-- Name: idx_service_history_changed_at; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_service_history_changed_at ON greenhouse_core.service_history USING btree (changed_at DESC);


--
-- Name: idx_service_history_service; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_service_history_service ON greenhouse_core.service_history USING btree (service_id);


--
-- Name: idx_service_modules_kind; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_service_modules_kind ON greenhouse_core.service_modules USING btree (module_kind);


--
-- Name: idx_services_hubspot_id; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_services_hubspot_id ON greenhouse_core.services USING btree (hubspot_service_id);


--
-- Name: idx_services_linea; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_services_linea ON greenhouse_core.services USING btree (linea_de_servicio);


--
-- Name: idx_services_org_id; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_services_org_id ON greenhouse_core.services USING btree (organization_id);


--
-- Name: idx_services_pipeline_stage; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_services_pipeline_stage ON greenhouse_core.services USING btree (pipeline_stage);


--
-- Name: idx_services_servicio; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_services_servicio ON greenhouse_core.services USING btree (servicio_especifico);


--
-- Name: idx_services_space_id; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_services_space_id ON greenhouse_core.services USING btree (space_id);


--
-- Name: idx_space_notion_active; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_space_notion_active ON greenhouse_core.space_notion_sources USING btree (sync_enabled) WHERE (sync_enabled = true);


--
-- Name: idx_user_view_overrides_active; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_user_view_overrides_active ON greenhouse_core.user_view_overrides USING btree (user_id, expires_at);


--
-- Name: idx_view_access_log_created_at; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_view_access_log_created_at ON greenhouse_core.view_access_log USING btree (created_at DESC);


--
-- Name: idx_view_registry_section_order; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_view_registry_section_order ON greenhouse_core.view_registry USING btree (section, display_order, label) WHERE (active = true);


--
-- Name: members_department_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX members_department_idx ON greenhouse_core.members USING btree (department_id);


--
-- Name: members_identity_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX members_identity_idx ON greenhouse_core.members USING btree (identity_profile_id);


--
-- Name: members_reports_to_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX members_reports_to_idx ON greenhouse_core.members USING btree (reports_to_member_id);


--
-- Name: idx_reporting_lines_current_member; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE UNIQUE INDEX idx_reporting_lines_current_member ON greenhouse_core.reporting_lines USING btree (member_id) WHERE (effective_to IS NULL);


--
-- Name: idx_reporting_lines_current_supervisor; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_reporting_lines_current_supervisor ON greenhouse_core.reporting_lines USING btree (supervisor_member_id, member_id) WHERE (effective_to IS NULL);


--
-- Name: idx_reporting_lines_member_history; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_reporting_lines_member_history ON greenhouse_core.reporting_lines USING btree (member_id, effective_from DESC);


--
-- Name: idx_reporting_lines_supervisor_history; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_reporting_lines_supervisor_history ON greenhouse_core.reporting_lines USING btree (supervisor_member_id, effective_from DESC);


--
-- Name: idx_opresp_member_id; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_opresp_member_id ON greenhouse_core.operational_responsibilities USING btree (member_id);


--
-- Name: idx_opresp_scope; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_opresp_scope ON greenhouse_core.operational_responsibilities USING btree (scope_type, scope_id);


--
-- Name: idx_opresp_scope_type; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_opresp_scope_type ON greenhouse_core.operational_responsibilities USING btree (scope_id, responsibility_type);


--
-- Name: idx_opresp_active; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX idx_opresp_active ON greenhouse_core.operational_responsibilities USING btree (active) WHERE (active = true);


--
-- Name: idx_opresp_unique_primary; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE UNIQUE INDEX idx_opresp_unique_primary ON greenhouse_core.operational_responsibilities USING btree (scope_type, scope_id, responsibility_type) WHERE ((is_primary = true) AND (active = true));


--
-- Name: idx_opresp_no_dup_assignment; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE UNIQUE INDEX idx_opresp_no_dup_assignment ON greenhouse_core.operational_responsibilities USING btree (member_id, scope_type, scope_id, responsibility_type, effective_from) WHERE (active = true);


--
-- Name: notion_workspace_source_bindings_lookup_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX notion_workspace_source_bindings_lookup_idx ON greenhouse_core.notion_workspace_source_bindings USING btree (source_system, source_object_type, source_object_id, binding_role);


--
-- Name: notion_workspace_source_bindings_space_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX notion_workspace_source_bindings_space_idx ON greenhouse_core.notion_workspace_source_bindings USING btree (space_id);


--
-- Name: notion_workspaces_client_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX notion_workspaces_client_idx ON greenhouse_core.notion_workspaces USING btree (client_id);


--
-- Name: notion_workspaces_workspace_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX notion_workspaces_workspace_idx ON greenhouse_core.notion_workspaces USING btree (primary_project_database_source_id);


--
-- Name: organizations_hubspot_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX organizations_hubspot_idx ON greenhouse_core.organizations USING btree (hubspot_company_id);


--
-- Name: organizations_public_id_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX organizations_public_id_idx ON greenhouse_core.organizations USING btree (public_id);


--
-- Name: organizations_status_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX organizations_status_idx ON greenhouse_core.organizations USING btree (status) WHERE (active = true);


--
-- Name: organizations_tax_id_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX organizations_tax_id_idx ON greenhouse_core.organizations USING btree (tax_id) WHERE ((tax_id IS NOT NULL) AND (tax_id <> ''::text));


--
-- Name: organizations_type_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX organizations_type_idx ON greenhouse_core.organizations USING btree (organization_type) WHERE (active = true);


--
-- Name: person_memberships_organization_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX person_memberships_organization_idx ON greenhouse_core.person_memberships USING btree (organization_id);


--
-- Name: person_memberships_profile_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX person_memberships_profile_idx ON greenhouse_core.person_memberships USING btree (profile_id);


--
-- Name: person_memberships_space_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX person_memberships_space_idx ON greenhouse_core.person_memberships USING btree (space_id);


--
-- Name: person_memberships_type_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX person_memberships_type_idx ON greenhouse_core.person_memberships USING btree (membership_type) WHERE (active = true);


--
-- Name: space_source_bindings_lookup_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX space_source_bindings_lookup_idx ON greenhouse_core.notion_workspace_source_bindings USING btree (source_system, source_object_type, source_object_id, binding_role);


--
-- Name: space_source_bindings_space_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX space_source_bindings_space_idx ON greenhouse_core.notion_workspace_source_bindings USING btree (space_id);


--
-- Name: spaces_client_bridge_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX spaces_client_bridge_idx ON greenhouse_core.spaces USING btree (client_id);


--
-- Name: spaces_client_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX spaces_client_idx ON greenhouse_core.notion_workspaces USING btree (client_id);


--
-- Name: spaces_organization_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX spaces_organization_idx ON greenhouse_core.spaces USING btree (organization_id);


--
-- Name: spaces_status_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX spaces_status_idx ON greenhouse_core.spaces USING btree (status) WHERE (active = true);


--
-- Name: spaces_workspace_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX spaces_workspace_idx ON greenhouse_core.notion_workspaces USING btree (primary_project_database_source_id);


--
-- Name: user_campaign_scopes_user_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX user_campaign_scopes_user_idx ON greenhouse_core.user_campaign_scopes USING btree (user_id) WHERE (active = true);


--
-- Name: user_client_scopes_user_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX user_client_scopes_user_idx ON greenhouse_core.user_client_scopes USING btree (user_id) WHERE (active = true);


--
-- Name: user_project_scopes_user_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX user_project_scopes_user_idx ON greenhouse_core.user_project_scopes USING btree (user_id) WHERE (active = true);


--
-- Name: user_role_assignments_user_idx; Type: INDEX; Schema: greenhouse_core; Owner: -
--

CREATE INDEX user_role_assignments_user_idx ON greenhouse_core.user_role_assignments USING btree (user_id);


--
-- Name: idx_period_closures_status; Type: INDEX; Schema: greenhouse_cost_intelligence; Owner: -
--

CREATE INDEX idx_period_closures_status ON greenhouse_cost_intelligence.period_closures USING btree (closure_status, period_year DESC, period_month DESC);


--
-- Name: crm_companies_client_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_companies_client_idx ON greenhouse_crm.companies USING btree (client_id);


--
-- Name: crm_companies_owner_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_companies_owner_idx ON greenhouse_crm.companies USING btree (owner_user_id);


--
-- Name: crm_companies_owner_member_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_companies_owner_member_idx ON greenhouse_crm.companies USING btree (owner_member_id);


--
-- Name: crm_contacts_client_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_contacts_client_idx ON greenhouse_crm.contacts USING btree (client_id);


--
-- Name: crm_contacts_company_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_contacts_company_idx ON greenhouse_crm.contacts USING btree (company_record_id);


--
-- Name: crm_contacts_email_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_contacts_email_idx ON greenhouse_crm.contacts USING btree (lower(email));


--
-- Name: crm_contacts_identity_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_contacts_identity_idx ON greenhouse_crm.contacts USING btree (linked_identity_profile_id);


--
-- Name: crm_contacts_owner_member_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_contacts_owner_member_idx ON greenhouse_crm.contacts USING btree (owner_member_id);


--
-- Name: crm_contacts_user_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_contacts_user_idx ON greenhouse_crm.contacts USING btree (linked_user_id);


--
-- Name: crm_deals_client_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_deals_client_idx ON greenhouse_crm.deals USING btree (client_id);


--
-- Name: crm_deals_company_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_deals_company_idx ON greenhouse_crm.deals USING btree (company_record_id);


--
-- Name: crm_deals_module_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_deals_module_idx ON greenhouse_crm.deals USING btree (module_id);


--
-- Name: crm_deals_owner_member_idx; Type: INDEX; Schema: greenhouse_crm; Owner: -
--

CREATE INDEX crm_deals_owner_member_idx ON greenhouse_crm.deals USING btree (owner_member_id);


--
-- Name: delivery_projects_client_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_projects_client_idx ON greenhouse_delivery.projects USING btree (client_id);


--
-- Name: delivery_projects_database_source_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_projects_database_source_idx ON greenhouse_delivery.projects USING btree (project_database_source_id);


--
-- Name: delivery_projects_module_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_projects_module_idx ON greenhouse_delivery.projects USING btree (module_id);


--
-- Name: delivery_projects_space_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_projects_space_idx ON greenhouse_delivery.projects USING btree (space_id);


--
-- Name: delivery_spm_space_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_spm_space_idx ON greenhouse_delivery.space_property_mappings USING btree (space_id);


--
-- Name: delivery_sprints_database_source_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_sprints_database_source_idx ON greenhouse_delivery.sprints USING btree (project_database_source_id);


--
-- Name: delivery_sprints_project_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_sprints_project_idx ON greenhouse_delivery.sprints USING btree (project_record_id);


--
-- Name: delivery_sprints_space_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_sprints_space_idx ON greenhouse_delivery.sprints USING btree (space_id);


--
-- Name: delivery_tasks_assignee_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_tasks_assignee_idx ON greenhouse_delivery.tasks USING btree (assignee_member_id);


--
-- Name: delivery_tasks_client_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_tasks_client_idx ON greenhouse_delivery.tasks USING btree (client_id);


--
-- Name: delivery_tasks_database_source_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_tasks_database_source_idx ON greenhouse_delivery.tasks USING btree (project_database_source_id);


--
-- Name: delivery_tasks_module_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_tasks_module_idx ON greenhouse_delivery.tasks USING btree (module_id);


--
-- Name: delivery_tasks_project_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_tasks_project_idx ON greenhouse_delivery.tasks USING btree (project_record_id);


--
-- Name: delivery_tasks_space_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_tasks_space_idx ON greenhouse_delivery.tasks USING btree (space_id);


--
-- Name: delivery_tasks_sprint_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX delivery_tasks_sprint_idx ON greenhouse_delivery.tasks USING btree (sprint_record_id);


--
-- Name: staff_aug_events_placement_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX staff_aug_events_placement_idx ON greenhouse_delivery.staff_aug_events USING btree (placement_id, created_at DESC);


--
-- Name: staff_aug_onboarding_items_placement_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX staff_aug_onboarding_items_placement_idx ON greenhouse_delivery.staff_aug_onboarding_items USING btree (placement_id, sort_order);


--
-- Name: staff_aug_placements_client_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX staff_aug_placements_client_idx ON greenhouse_delivery.staff_aug_placements USING btree (client_id, status);


--
-- Name: staff_aug_placements_member_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX staff_aug_placements_member_idx ON greenhouse_delivery.staff_aug_placements USING btree (member_id, status);


--
-- Name: staff_aug_placements_provider_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX staff_aug_placements_provider_idx ON greenhouse_delivery.staff_aug_placements USING btree (provider_id);


--
-- Name: staff_aug_placements_space_idx; Type: INDEX; Schema: greenhouse_delivery; Owner: -
--

CREATE INDEX staff_aug_placements_space_idx ON greenhouse_delivery.staff_aug_placements USING btree (space_id);


--
-- Name: finance_accounts_active_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_accounts_active_idx ON greenhouse_finance.accounts USING btree (is_active, account_name);


--
-- Name: finance_bank_rows_period_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_bank_rows_period_idx ON greenhouse_finance.bank_statement_rows USING btree (period_id, transaction_date);


--
-- Name: finance_bank_rows_unmatched_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_bank_rows_unmatched_idx ON greenhouse_finance.bank_statement_rows USING btree (match_status, transaction_date DESC) WHERE (match_status = 'unmatched'::text);


--
-- Name: finance_client_profiles_client_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_client_profiles_client_idx ON greenhouse_finance.client_profiles USING btree (client_id);


--
-- Name: finance_client_profiles_hubspot_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_client_profiles_hubspot_idx ON greenhouse_finance.client_profiles USING btree (hubspot_company_id);


--
-- Name: finance_client_profiles_org_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_client_profiles_org_idx ON greenhouse_finance.client_profiles USING btree (organization_id);


--
-- Name: finance_economic_indicators_code_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_economic_indicators_code_idx ON greenhouse_finance.economic_indicators USING btree (indicator_code, indicator_date DESC);


--
-- Name: finance_exchange_rates_pair_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_exchange_rates_pair_idx ON greenhouse_finance.exchange_rates USING btree (from_currency, to_currency, rate_date DESC);


--
-- Name: finance_expenses_client_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_expenses_client_idx ON greenhouse_finance.expenses USING btree (client_id);


--
-- Name: finance_expenses_member_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_expenses_member_idx ON greenhouse_finance.expenses USING btree (member_id);


--
-- Name: finance_expenses_payroll_period_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_expenses_payroll_period_idx ON greenhouse_finance.expenses USING btree (payroll_period_id, expense_type, source_type);


--
-- Name: finance_expenses_source_type_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_expenses_source_type_idx ON greenhouse_finance.expenses USING btree (source_type, payment_date DESC);


--
-- Name: finance_expenses_space_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_expenses_space_idx ON greenhouse_finance.expenses USING btree (space_id, payment_date DESC);


--
-- Name: finance_expenses_status_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_expenses_status_idx ON greenhouse_finance.expenses USING btree (payment_status, due_date DESC);


--
-- Name: finance_expenses_supplier_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_expenses_supplier_idx ON greenhouse_finance.expenses USING btree (supplier_id);


--
-- Name: finance_expenses_type_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_expenses_type_idx ON greenhouse_finance.expenses USING btree (expense_type, payment_date DESC);


--
-- Name: finance_factoring_income_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_factoring_income_idx ON greenhouse_finance.factoring_operations USING btree (income_id);


--
-- Name: finance_factoring_provider_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_factoring_provider_idx ON greenhouse_finance.factoring_operations USING btree (factoring_provider_id);


--
-- Name: finance_factoring_status_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_factoring_status_idx ON greenhouse_finance.factoring_operations USING btree (status, operation_date DESC);


--
-- Name: finance_income_client_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_income_client_idx ON greenhouse_finance.income USING btree (client_id);


--
-- Name: finance_income_date_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_income_date_idx ON greenhouse_finance.income USING btree (invoice_date DESC);


--
-- Name: finance_income_organization_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_income_organization_idx ON greenhouse_finance.income USING btree (organization_id);


--
-- Name: finance_income_payments_income_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_income_payments_income_idx ON greenhouse_finance.income_payments USING btree (income_id);


--
-- Name: finance_income_payments_unreconciled_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_income_payments_unreconciled_idx ON greenhouse_finance.income_payments USING btree (is_reconciled, payment_date DESC) WHERE (is_reconciled = false);


--
-- Name: finance_income_status_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_income_status_idx ON greenhouse_finance.income USING btree (payment_status, invoice_date DESC);


--
-- Name: finance_reconciliation_account_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_reconciliation_account_idx ON greenhouse_finance.reconciliation_periods USING btree (account_id, year DESC, month DESC);


--
-- Name: finance_suppliers_active_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_suppliers_active_idx ON greenhouse_finance.suppliers USING btree (is_active, legal_name);


--
-- Name: finance_suppliers_organization_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_suppliers_organization_idx ON greenhouse_finance.suppliers USING btree (organization_id);


--
-- Name: finance_suppliers_provider_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX finance_suppliers_provider_idx ON greenhouse_finance.suppliers USING btree (provider_id);


--
-- Name: idx_client_econ_period; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_client_econ_period ON greenhouse_finance.client_economics USING btree (period_year, period_month);


--
-- Name: idx_client_profiles_client_id; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_client_profiles_client_id ON greenhouse_finance.client_profiles USING btree (client_id);


--
-- Name: idx_client_profiles_hubspot_id; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_client_profiles_hubspot_id ON greenhouse_finance.client_profiles USING btree (hubspot_company_id) WHERE (hubspot_company_id IS NOT NULL);


--
-- Name: idx_cost_alloc_client; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_cost_alloc_client ON greenhouse_finance.cost_allocations USING btree (client_id, period_year, period_month);


--
-- Name: idx_cost_alloc_expense; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_cost_alloc_expense ON greenhouse_finance.cost_allocations USING btree (expense_id);


--
-- Name: idx_expenses_direct_overhead_member; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_expenses_direct_overhead_member ON greenhouse_finance.expenses USING btree (direct_overhead_member_id, direct_overhead_scope) WHERE (direct_overhead_scope = 'member_direct'::text);


--
-- Name: idx_hes_client_status; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_hes_client_status ON greenhouse_finance.service_entry_sheets USING btree (client_id, status);


--
-- Name: idx_hes_po; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_hes_po ON greenhouse_finance.service_entry_sheets USING btree (purchase_order_id);


--
-- Name: idx_line_items_income; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_line_items_income ON greenhouse_finance.income_line_items USING btree (income_id);


--
-- Name: idx_nubox_emission_log_created; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_nubox_emission_log_created ON greenhouse_finance.nubox_emission_log USING btree (created_at DESC);


--
-- Name: idx_nubox_emission_log_income; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_nubox_emission_log_income ON greenhouse_finance.nubox_emission_log USING btree (income_id);


--
-- Name: idx_po_client_status; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_po_client_status ON greenhouse_finance.purchase_orders USING btree (client_id, status);


--
-- Name: idx_po_expiry; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_po_expiry ON greenhouse_finance.purchase_orders USING btree (expiry_date) WHERE (status = 'active'::text);


--
-- Name: idx_quotes_client; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_quotes_client ON greenhouse_finance.quotes USING btree (client_id);


--
-- Name: idx_quotes_nubox; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_quotes_nubox ON greenhouse_finance.quotes USING btree (nubox_document_id);


--
-- Name: idx_quotes_status; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX idx_quotes_status ON greenhouse_finance.quotes USING btree (status);


--
-- Name: purchase_orders_attachment_asset_idx; Type: INDEX; Schema: greenhouse_finance; Owner: -
--

CREATE INDEX purchase_orders_attachment_asset_idx ON greenhouse_finance.purchase_orders USING btree (attachment_asset_id);


--
-- Name: leave_balances_member_year_idx; Type: INDEX; Schema: greenhouse_hr; Owner: -
--

CREATE INDEX leave_balances_member_year_idx ON greenhouse_hr.leave_balances USING btree (member_id, year);


--
-- Name: leave_balances_type_year_idx; Type: INDEX; Schema: greenhouse_hr; Owner: -
--

CREATE INDEX leave_balances_type_year_idx ON greenhouse_hr.leave_balances USING btree (leave_type_code, year);


--
-- Name: leave_policies_leave_type_idx; Type: INDEX; Schema: greenhouse_hr; Owner: -
--

CREATE INDEX leave_policies_leave_type_idx ON greenhouse_hr.leave_policies USING btree (leave_type_code, active);


--
-- Name: leave_request_actions_request_idx; Type: INDEX; Schema: greenhouse_hr; Owner: -
--

CREATE INDEX leave_request_actions_request_idx ON greenhouse_hr.leave_request_actions USING btree (request_id, created_at DESC);


--
-- Name: leave_requests_attachment_asset_idx; Type: INDEX; Schema: greenhouse_hr; Owner: -
--

CREATE INDEX leave_requests_attachment_asset_idx ON greenhouse_hr.leave_requests USING btree (attachment_asset_id);


--
-- Name: leave_requests_member_created_idx; Type: INDEX; Schema: greenhouse_hr; Owner: -
--

CREATE INDEX leave_requests_member_created_idx ON greenhouse_hr.leave_requests USING btree (member_id, created_at DESC);


--
-- Name: leave_requests_status_start_idx; Type: INDEX; Schema: greenhouse_hr; Owner: -
--

CREATE INDEX leave_requests_status_start_idx ON greenhouse_hr.leave_requests USING btree (status, start_date DESC);


--
-- Name: leave_requests_supervisor_status_idx; Type: INDEX; Schema: greenhouse_hr; Owner: -
--

CREATE INDEX leave_requests_supervisor_status_idx ON greenhouse_hr.leave_requests USING btree (supervisor_member_id, status, created_at DESC);


--
-- Name: idx_workflow_approval_snapshots_effective_approver; Type: INDEX; Schema: greenhouse_hr; Owner: -
--

CREATE INDEX idx_workflow_approval_snapshots_effective_approver ON greenhouse_hr.workflow_approval_snapshots USING btree (effective_approver_member_id, workflow_domain, stage_code);


--
-- Name: idx_workflow_approval_snapshots_subject_member; Type: INDEX; Schema: greenhouse_hr; Owner: -
--

CREATE INDEX idx_workflow_approval_snapshots_subject_member ON greenhouse_hr.workflow_approval_snapshots USING btree (subject_member_id, created_at DESC);


--
-- Name: idx_workflow_approval_snapshots_workflow_stage; Type: INDEX; Schema: greenhouse_hr; Owner: -
--

CREATE UNIQUE INDEX idx_workflow_approval_snapshots_workflow_stage ON greenhouse_hr.workflow_approval_snapshots USING btree (workflow_domain, workflow_entity_id, stage_code);


--
-- Name: idx_email_deliveries_batch; Type: INDEX; Schema: greenhouse_notifications; Owner: -
--

CREATE INDEX idx_email_deliveries_batch ON greenhouse_notifications.email_deliveries USING btree (batch_id);


--
-- Name: idx_email_deliveries_recipient; Type: INDEX; Schema: greenhouse_notifications; Owner: -
--

CREATE INDEX idx_email_deliveries_recipient ON greenhouse_notifications.email_deliveries USING btree (recipient_email, created_at DESC);


--
-- Name: idx_email_deliveries_status; Type: INDEX; Schema: greenhouse_notifications; Owner: -
--

CREATE INDEX idx_email_deliveries_status ON greenhouse_notifications.email_deliveries USING btree (status, created_at DESC);


--
-- Name: idx_email_deliveries_type; Type: INDEX; Schema: greenhouse_notifications; Owner: -
--

CREATE INDEX idx_email_deliveries_type ON greenhouse_notifications.email_deliveries USING btree (email_type, created_at DESC);


--
-- Name: idx_email_subscriptions_type_active; Type: INDEX; Schema: greenhouse_notifications; Owner: -
--

CREATE INDEX idx_email_subscriptions_type_active ON greenhouse_notifications.email_subscriptions USING btree (email_type, active, created_at DESC);


--
-- Name: idx_notif_created; Type: INDEX; Schema: greenhouse_notifications; Owner: -
--

CREATE INDEX idx_notif_created ON greenhouse_notifications.notifications USING btree (created_at DESC);


--
-- Name: idx_notif_user_status; Type: INDEX; Schema: greenhouse_notifications; Owner: -
--

CREATE INDEX idx_notif_user_status ON greenhouse_notifications.notifications USING btree (user_id, status);


--
-- Name: idx_notification_log_user_category_event; Type: INDEX; Schema: greenhouse_notifications; Owner: -
--

CREATE INDEX idx_notification_log_user_category_event ON greenhouse_notifications.notification_log USING btree (user_id, category, created_at DESC);


--
-- Name: idx_notifications_user_category; Type: INDEX; Schema: greenhouse_notifications; Owner: -
--

CREATE INDEX idx_notifications_user_category ON greenhouse_notifications.notifications USING btree (user_id, category, created_at DESC);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: greenhouse_notifications; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON greenhouse_notifications.notifications USING btree (user_id, created_at DESC) WHERE ((read_at IS NULL) AND (archived_at IS NULL));


--
-- Name: idx_notifications_user_unread_count; Type: INDEX; Schema: greenhouse_notifications; Owner: -
--

CREATE INDEX idx_notifications_user_unread_count ON greenhouse_notifications.notifications USING btree (user_id) WHERE ((read_at IS NULL) AND (archived_at IS NULL));


--
-- Name: chile_afp_rates_period_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX chile_afp_rates_period_idx ON greenhouse_payroll.chile_afp_rates USING btree (period_year DESC, period_month DESC);


--
-- Name: chile_previred_indicators_period_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX chile_previred_indicators_period_idx ON greenhouse_payroll.chile_previred_indicators USING btree (period_year DESC, period_month DESC);


--
-- Name: comp_versions_current_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX comp_versions_current_idx ON greenhouse_payroll.compensation_versions USING btree (is_current) WHERE (is_current = true);


--
-- Name: comp_versions_member_effective_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX comp_versions_member_effective_idx ON greenhouse_payroll.compensation_versions USING btree (member_id, effective_from DESC);


--
-- Name: idx_tax_brackets_version; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX idx_tax_brackets_version ON greenhouse_payroll.chile_tax_brackets USING btree (tax_table_version, bracket_order);


--
-- Name: payroll_entries_member_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX payroll_entries_member_idx ON greenhouse_payroll.payroll_entries USING btree (member_id, created_at DESC);


--
-- Name: payroll_entries_period_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX payroll_entries_period_idx ON greenhouse_payroll.payroll_entries USING btree (period_id);


--
-- Name: payroll_export_packages_csv_asset_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX payroll_export_packages_csv_asset_idx ON greenhouse_payroll.payroll_export_packages USING btree (csv_asset_id);


--
-- Name: payroll_export_packages_delivery_status_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX payroll_export_packages_delivery_status_idx ON greenhouse_payroll.payroll_export_packages USING btree (delivery_status, updated_at DESC);


--
-- Name: payroll_export_packages_last_sent_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX payroll_export_packages_last_sent_idx ON greenhouse_payroll.payroll_export_packages USING btree (last_sent_at DESC, updated_at DESC);


--
-- Name: payroll_export_packages_pdf_asset_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX payroll_export_packages_pdf_asset_idx ON greenhouse_payroll.payroll_export_packages USING btree (pdf_asset_id);


--
-- Name: payroll_periods_year_month_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX payroll_periods_year_month_idx ON greenhouse_payroll.payroll_periods USING btree (year DESC, month DESC);


--
-- Name: payroll_receipts_asset_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX payroll_receipts_asset_idx ON greenhouse_payroll.payroll_receipts USING btree (asset_id);


--
-- Name: payroll_receipts_period_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX payroll_receipts_period_idx ON greenhouse_payroll.payroll_receipts USING btree (period_id, revision DESC);


--
-- Name: payroll_receipts_source_event_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX payroll_receipts_source_event_idx ON greenhouse_payroll.payroll_receipts USING btree (source_event_id, created_at DESC);


--
-- Name: previred_afp_rates_date_code_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX previred_afp_rates_date_code_idx ON greenhouse_payroll.previred_afp_rates USING btree (indicator_date DESC, afp_code);


--
-- Name: previred_period_indicators_date_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX previred_period_indicators_date_idx ON greenhouse_payroll.previred_period_indicators USING btree (indicator_date DESC);


--
-- Name: projected_payroll_promotions_period_idx; Type: INDEX; Schema: greenhouse_payroll; Owner: -
--

CREATE INDEX projected_payroll_promotions_period_idx ON greenhouse_payroll.projected_payroll_promotions USING btree (period_year DESC, period_month DESC, projection_mode);


--
-- Name: idx_ico_member_period; Type: INDEX; Schema: greenhouse_serving; Owner: -
--

CREATE INDEX idx_ico_member_period ON greenhouse_serving.ico_member_metrics USING btree (period_year, period_month);


--
-- Name: idx_ico_member_metrics_member_period; Type: INDEX; Schema: greenhouse_serving; Owner: -
--

CREATE INDEX idx_ico_member_metrics_member_period ON greenhouse_serving.ico_member_metrics USING btree (member_id, period_year DESC, period_month DESC);


--
-- Name: idx_ico_organization_metrics_period; Type: INDEX; Schema: greenhouse_serving; Owner: -
--

CREATE INDEX idx_ico_organization_metrics_period ON greenhouse_serving.ico_organization_metrics USING btree (period_year, period_month);


--
-- Name: idx_operational_pl_period; Type: INDEX; Schema: greenhouse_serving; Owner: -
--

CREATE INDEX idx_operational_pl_period ON greenhouse_serving.operational_pl_snapshots USING btree (period_year DESC, period_month DESC, period_closed);


--
-- Name: idx_operational_pl_scope_period; Type: INDEX; Schema: greenhouse_serving; Owner: -
--

CREATE INDEX idx_operational_pl_scope_period ON greenhouse_serving.operational_pl_snapshots USING btree (scope_type, scope_id, period_year DESC, period_month DESC);


--
-- Name: idx_org_ops_metrics_org; Type: INDEX; Schema: greenhouse_serving; Owner: -
--

CREATE INDEX idx_org_ops_metrics_org ON greenhouse_serving.organization_operational_metrics USING btree (organization_id);


--
-- Name: idx_period_closure_status_state; Type: INDEX; Schema: greenhouse_serving; Owner: -
--

CREATE INDEX idx_period_closure_status_state ON greenhouse_serving.period_closure_status USING btree (closure_status, period_year DESC, period_month DESC);


--
-- Name: idx_po360_member_period; Type: INDEX; Schema: greenhouse_serving; Owner: -
--

CREATE INDEX idx_po360_member_period ON greenhouse_serving.person_operational_360 USING btree (member_id, period_year DESC, period_month DESC);


--
-- Name: idx_po360_period; Type: INDEX; Schema: greenhouse_serving; Owner: -
--

CREATE INDEX idx_po360_period ON greenhouse_serving.person_operational_360 USING btree (period_year, period_month);


--
-- Name: idx_projected_payroll_period; Type: INDEX; Schema: greenhouse_serving; Owner: -
--

CREATE INDEX idx_projected_payroll_period ON greenhouse_serving.projected_payroll_snapshots USING btree (period_year, period_month);


--
-- Name: staff_aug_snapshots_period_idx; Type: INDEX; Schema: greenhouse_serving; Owner: -
--

CREATE INDEX staff_aug_snapshots_period_idx ON greenhouse_serving.staff_aug_placement_snapshots USING btree (period_year DESC, period_month DESC, placement_id);


--
-- Name: idx_prq_entity; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX idx_prq_entity ON greenhouse_sync.projection_refresh_queue USING btree (entity_type, entity_id);


--
-- Name: idx_prq_projection; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX idx_prq_projection ON greenhouse_sync.projection_refresh_queue USING btree (projection_name);


--
-- Name: idx_prq_status; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX idx_prq_status ON greenhouse_sync.projection_refresh_queue USING btree (status);


--
-- Name: idx_recon_active_source; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE UNIQUE INDEX idx_recon_active_source ON greenhouse_sync.identity_reconciliation_proposals USING btree (source_system, source_object_type, source_object_id) WHERE (status = ANY (ARRAY['pending'::text, 'auto_linked'::text]));


--
-- Name: idx_recon_status; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX idx_recon_status ON greenhouse_sync.identity_reconciliation_proposals USING btree (status, created_at DESC);


--
-- Name: idx_sync_queue_status; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX idx_sync_queue_status ON greenhouse_sync.service_sync_queue USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: outbox_events_pending_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX outbox_events_pending_idx ON greenhouse_sync.outbox_events USING btree (status, occurred_at);


--
-- Name: source_sync_failures_run_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX source_sync_failures_run_idx ON greenhouse_sync.source_sync_failures USING btree (sync_run_id, created_at DESC);


--
-- Name: source_sync_failures_source_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX source_sync_failures_source_idx ON greenhouse_sync.source_sync_failures USING btree (source_system, source_object_type, created_at DESC);


--
-- Name: source_sync_runs_source_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX source_sync_runs_source_idx ON greenhouse_sync.source_sync_runs USING btree (source_system, source_object_type, started_at DESC);


--
-- Name: source_sync_runs_status_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX source_sync_runs_status_idx ON greenhouse_sync.source_sync_runs USING btree (status, started_at DESC);


--
-- Name: source_sync_watermarks_lookup_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX source_sync_watermarks_lookup_idx ON greenhouse_sync.source_sync_watermarks USING btree (source_system, source_object_type, watermark_key);


--
-- Name: webhook_deliveries_event_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX webhook_deliveries_event_idx ON greenhouse_sync.webhook_deliveries USING btree (event_id);


--
-- Name: webhook_deliveries_pending_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX webhook_deliveries_pending_idx ON greenhouse_sync.webhook_deliveries USING btree (status, next_retry_at) WHERE (status = ANY (ARRAY['pending'::text, 'retry_scheduled'::text]));


--
-- Name: webhook_deliveries_subscription_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX webhook_deliveries_subscription_idx ON greenhouse_sync.webhook_deliveries USING btree (webhook_subscription_id, created_at DESC);


--
-- Name: webhook_delivery_attempts_delivery_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX webhook_delivery_attempts_delivery_idx ON greenhouse_sync.webhook_delivery_attempts USING btree (webhook_delivery_id, attempt_number);


--
-- Name: webhook_inbox_events_endpoint_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX webhook_inbox_events_endpoint_idx ON greenhouse_sync.webhook_inbox_events USING btree (webhook_endpoint_id, received_at DESC);


--
-- Name: webhook_inbox_events_status_idx; Type: INDEX; Schema: greenhouse_sync; Owner: -
--

CREATE INDEX webhook_inbox_events_status_idx ON greenhouse_sync.webhook_inbox_events USING btree (status, received_at DESC);


--
-- Name: identity_profiles trg_identity_public_id; Type: TRIGGER; Schema: greenhouse_core; Owner: -
--

CREATE TRIGGER trg_identity_public_id BEFORE INSERT ON greenhouse_core.identity_profiles FOR EACH ROW EXECUTE FUNCTION greenhouse_core.set_identity_public_id();


--
-- Name: reporting_lines trg_reporting_lines_sync_snapshot; Type: TRIGGER; Schema: greenhouse_core; Owner: -
--

CREATE TRIGGER trg_reporting_lines_sync_snapshot AFTER INSERT OR DELETE OR UPDATE ON greenhouse_core.reporting_lines FOR EACH ROW EXECUTE FUNCTION greenhouse_core.reporting_lines_sync_snapshot_trigger();


--
-- Name: reporting_lines trg_reporting_lines_touch_updated_at; Type: TRIGGER; Schema: greenhouse_core; Owner: -
--

CREATE TRIGGER trg_reporting_lines_touch_updated_at BEFORE UPDATE ON greenhouse_core.reporting_lines FOR EACH ROW EXECUTE FUNCTION greenhouse_core.touch_reporting_lines_updated_at();


--
-- Name: workflow_approval_snapshots trg_workflow_approval_snapshots_touch_updated_at; Type: TRIGGER; Schema: greenhouse_hr; Owner: -
--

CREATE TRIGGER trg_workflow_approval_snapshots_touch_updated_at BEFORE UPDATE ON greenhouse_hr.workflow_approval_snapshots FOR EACH ROW EXECUTE FUNCTION greenhouse_hr.touch_workflow_approval_snapshots_updated_at();


--
-- Name: credit_ledger credit_ledger_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.credit_ledger
    ADD CONSTRAINT credit_ledger_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id);


--
-- Name: credit_ledger credit_ledger_consumed_by_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.credit_ledger
    ADD CONSTRAINT credit_ledger_consumed_by_member_id_fkey FOREIGN KEY (consumed_by_member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: credit_ledger credit_ledger_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.credit_ledger
    ADD CONSTRAINT credit_ledger_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: credit_ledger credit_ledger_wallet_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.credit_ledger
    ADD CONSTRAINT credit_ledger_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES greenhouse_ai.credit_wallets(wallet_id) ON DELETE CASCADE;


--
-- Name: credit_wallets credit_wallets_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.credit_wallets
    ADD CONSTRAINT credit_wallets_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id);


--
-- Name: credit_wallets credit_wallets_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.credit_wallets
    ADD CONSTRAINT credit_wallets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: credit_wallets credit_wallets_tool_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.credit_wallets
    ADD CONSTRAINT credit_wallets_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES greenhouse_ai.tool_catalog(tool_id) ON DELETE CASCADE;


--
-- Name: member_tool_licenses member_tool_licenses_assigned_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.member_tool_licenses
    ADD CONSTRAINT member_tool_licenses_assigned_by_user_id_fkey FOREIGN KEY (assigned_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: member_tool_licenses member_tool_licenses_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.member_tool_licenses
    ADD CONSTRAINT member_tool_licenses_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: member_tool_licenses member_tool_licenses_tool_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.member_tool_licenses
    ADD CONSTRAINT member_tool_licenses_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES greenhouse_ai.tool_catalog(tool_id) ON DELETE CASCADE;


--
-- Name: nexa_messages nexa_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.nexa_messages
    ADD CONSTRAINT nexa_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES greenhouse_ai.nexa_threads(thread_id) ON DELETE CASCADE;


--
-- Name: tool_catalog tool_catalog_fin_supplier_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.tool_catalog
    ADD CONSTRAINT tool_catalog_fin_supplier_id_fkey FOREIGN KEY (fin_supplier_id) REFERENCES greenhouse_finance.suppliers(supplier_id);


--
-- Name: tool_catalog tool_catalog_provider_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_ai; Owner: -
--

ALTER TABLE ONLY greenhouse_ai.tool_catalog
    ADD CONSTRAINT tool_catalog_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES greenhouse_core.providers(provider_id);


--
-- Name: asset_access_log asset_access_log_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.asset_access_log
    ADD CONSTRAINT asset_access_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL;


--
-- Name: asset_access_log asset_access_log_asset_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.asset_access_log
    ADD CONSTRAINT asset_access_log_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES greenhouse_core.assets(asset_id) ON DELETE CASCADE;


--
-- Name: business_line_metadata business_line_metadata_module_code_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.business_line_metadata
    ADD CONSTRAINT business_line_metadata_module_code_fkey FOREIGN KEY (module_code) REFERENCES greenhouse_core.service_modules(module_code);


--
-- Name: campaign_project_links campaign_project_links_campaign_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.campaign_project_links
    ADD CONSTRAINT campaign_project_links_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES greenhouse_core.campaigns(campaign_id) ON DELETE CASCADE;


--
-- Name: campaign_project_links campaign_project_links_space_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.campaign_project_links
    ADD CONSTRAINT campaign_project_links_space_id_fkey FOREIGN KEY (space_id) REFERENCES greenhouse_core.spaces(space_id);


--
-- Name: campaigns campaigns_space_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.campaigns
    ADD CONSTRAINT campaigns_space_id_fkey FOREIGN KEY (space_id) REFERENCES greenhouse_core.spaces(space_id);


--
-- Name: client_feature_flags client_feature_flags_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_feature_flags
    ADD CONSTRAINT client_feature_flags_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id) ON DELETE CASCADE;


--
-- Name: client_service_modules client_service_modules_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_service_modules
    ADD CONSTRAINT client_service_modules_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id) ON DELETE CASCADE;


--
-- Name: client_service_modules client_service_modules_module_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_service_modules
    ADD CONSTRAINT client_service_modules_module_id_fkey FOREIGN KEY (module_id) REFERENCES greenhouse_core.service_modules(module_id) ON DELETE CASCADE;


--
-- Name: client_team_assignments client_team_assignments_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_team_assignments
    ADD CONSTRAINT client_team_assignments_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id);


--
-- Name: client_team_assignments client_team_assignments_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_team_assignments
    ADD CONSTRAINT client_team_assignments_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: client_users client_users_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_users
    ADD CONSTRAINT client_users_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id);


--
-- Name: client_users client_users_identity_profile_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_users
    ADD CONSTRAINT client_users_identity_profile_id_fkey FOREIGN KEY (identity_profile_id) REFERENCES greenhouse_core.identity_profiles(profile_id);


--
-- Name: client_users client_users_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.client_users
    ADD CONSTRAINT client_users_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: departments departments_parent_department_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.departments
    ADD CONSTRAINT departments_parent_department_id_fkey FOREIGN KEY (parent_department_id) REFERENCES greenhouse_core.departments(department_id);


--
-- Name: assets greenhouse_assets_attached_by_fk; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.assets
    ADD CONSTRAINT greenhouse_assets_attached_by_fk FOREIGN KEY (attached_by_user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL;


--
-- Name: assets greenhouse_assets_deleted_by_fk; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.assets
    ADD CONSTRAINT greenhouse_assets_deleted_by_fk FOREIGN KEY (deleted_by_user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL;


--
-- Name: assets greenhouse_assets_owner_client_fk; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.assets
    ADD CONSTRAINT greenhouse_assets_owner_client_fk FOREIGN KEY (owner_client_id) REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL;


--
-- Name: assets greenhouse_assets_owner_member_fk; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.assets
    ADD CONSTRAINT greenhouse_assets_owner_member_fk FOREIGN KEY (owner_member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL;


--
-- Name: assets greenhouse_assets_owner_space_fk; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.assets
    ADD CONSTRAINT greenhouse_assets_owner_space_fk FOREIGN KEY (owner_space_id) REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL;


--
-- Name: assets greenhouse_assets_uploaded_by_fk; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.assets
    ADD CONSTRAINT greenhouse_assets_uploaded_by_fk FOREIGN KEY (uploaded_by_user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL;


--
-- Name: identity_profile_source_links identity_profile_source_links_profile_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.identity_profile_source_links
    ADD CONSTRAINT identity_profile_source_links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE CASCADE;


--
-- Name: members members_department_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.members
    ADD CONSTRAINT members_department_id_fkey FOREIGN KEY (department_id) REFERENCES greenhouse_core.departments(department_id);


--
-- Name: members members_identity_profile_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.members
    ADD CONSTRAINT members_identity_profile_id_fkey FOREIGN KEY (identity_profile_id) REFERENCES greenhouse_core.identity_profiles(profile_id);


--
-- Name: members members_reports_to_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.members
    ADD CONSTRAINT members_reports_to_member_id_fkey FOREIGN KEY (reports_to_member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: reporting_lines reporting_lines_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.reporting_lines
    ADD CONSTRAINT reporting_lines_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: reporting_lines reporting_lines_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.reporting_lines
    ADD CONSTRAINT reporting_lines_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE;


--
-- Name: reporting_lines reporting_lines_supervisor_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.reporting_lines
    ADD CONSTRAINT reporting_lines_supervisor_member_id_fkey FOREIGN KEY (supervisor_member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: operational_responsibilities operational_responsibilities_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.operational_responsibilities
    ADD CONSTRAINT operational_responsibilities_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE;


--
-- Name: person_memberships person_memberships_organization_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.person_memberships
    ADD CONSTRAINT person_memberships_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES greenhouse_core.organizations(organization_id);


--
-- Name: person_memberships person_memberships_profile_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.person_memberships
    ADD CONSTRAINT person_memberships_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES greenhouse_core.identity_profiles(profile_id);


--
-- Name: person_memberships person_memberships_space_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.person_memberships
    ADD CONSTRAINT person_memberships_space_id_fkey FOREIGN KEY (space_id) REFERENCES greenhouse_core.spaces(space_id);


--
-- Name: role_view_assignments role_view_assignments_role_code_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.role_view_assignments
    ADD CONSTRAINT role_view_assignments_role_code_fkey FOREIGN KEY (role_code) REFERENCES greenhouse_core.roles(role_code);


--
-- Name: role_view_assignments role_view_assignments_view_code_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.role_view_assignments
    ADD CONSTRAINT role_view_assignments_view_code_fkey FOREIGN KEY (view_code) REFERENCES greenhouse_core.view_registry(view_code);


--
-- Name: service_history service_history_service_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.service_history
    ADD CONSTRAINT service_history_service_id_fkey FOREIGN KEY (service_id) REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE;


--
-- Name: services services_organization_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.services
    ADD CONSTRAINT services_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES greenhouse_core.organizations(organization_id);


--
-- Name: services services_space_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.services
    ADD CONSTRAINT services_space_id_fkey FOREIGN KEY (space_id) REFERENCES greenhouse_core.spaces(space_id);


--
-- Name: space_notion_sources space_notion_sources_space_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.space_notion_sources
    ADD CONSTRAINT space_notion_sources_space_id_fkey FOREIGN KEY (space_id) REFERENCES greenhouse_core.spaces(space_id);


--
-- Name: notion_workspace_source_bindings space_source_bindings_space_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.notion_workspace_source_bindings
    ADD CONSTRAINT space_source_bindings_space_id_fkey FOREIGN KEY (space_id) REFERENCES greenhouse_core.notion_workspaces(space_id) ON DELETE CASCADE;


--
-- Name: notion_workspaces spaces_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.notion_workspaces
    ADD CONSTRAINT spaces_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL;


--
-- Name: spaces spaces_client_id_fkey1; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.spaces
    ADD CONSTRAINT spaces_client_id_fkey1 FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id);


--
-- Name: spaces spaces_organization_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.spaces
    ADD CONSTRAINT spaces_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES greenhouse_core.organizations(organization_id);


--
-- Name: user_campaign_scopes user_campaign_scopes_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_campaign_scopes
    ADD CONSTRAINT user_campaign_scopes_user_id_fkey FOREIGN KEY (user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE CASCADE;


--
-- Name: user_client_scopes user_client_scopes_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_client_scopes
    ADD CONSTRAINT user_client_scopes_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id);


--
-- Name: user_client_scopes user_client_scopes_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_client_scopes
    ADD CONSTRAINT user_client_scopes_user_id_fkey FOREIGN KEY (user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE CASCADE;


--
-- Name: user_project_scopes user_project_scopes_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_project_scopes
    ADD CONSTRAINT user_project_scopes_user_id_fkey FOREIGN KEY (user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE CASCADE;


--
-- Name: user_role_assignments user_role_assignments_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_role_assignments
    ADD CONSTRAINT user_role_assignments_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id);


--
-- Name: user_role_assignments user_role_assignments_role_code_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_role_assignments
    ADD CONSTRAINT user_role_assignments_role_code_fkey FOREIGN KEY (role_code) REFERENCES greenhouse_core.roles(role_code);


--
-- Name: user_role_assignments user_role_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_role_assignments
    ADD CONSTRAINT user_role_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE CASCADE;


--
-- Name: user_view_overrides user_view_overrides_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_view_overrides
    ADD CONSTRAINT user_view_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: user_view_overrides user_view_overrides_view_code_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.user_view_overrides
    ADD CONSTRAINT user_view_overrides_view_code_fkey FOREIGN KEY (view_code) REFERENCES greenhouse_core.view_registry(view_code);


--
-- Name: view_access_log view_access_log_view_code_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.view_access_log
    ADD CONSTRAINT view_access_log_view_code_fkey FOREIGN KEY (view_code) REFERENCES greenhouse_core.view_registry(view_code);


--
-- Name: view_registry view_registry_parent_view_code_fkey; Type: FK CONSTRAINT; Schema: greenhouse_core; Owner: -
--

ALTER TABLE ONLY greenhouse_core.view_registry
    ADD CONSTRAINT view_registry_parent_view_code_fkey FOREIGN KEY (parent_view_code) REFERENCES greenhouse_core.view_registry(view_code);


--
-- Name: period_closures period_closures_closed_by_fkey; Type: FK CONSTRAINT; Schema: greenhouse_cost_intelligence; Owner: -
--

ALTER TABLE ONLY greenhouse_cost_intelligence.period_closures
    ADD CONSTRAINT period_closures_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: period_closures period_closures_reopened_by_fkey; Type: FK CONSTRAINT; Schema: greenhouse_cost_intelligence; Owner: -
--

ALTER TABLE ONLY greenhouse_cost_intelligence.period_closures
    ADD CONSTRAINT period_closures_reopened_by_fkey FOREIGN KEY (reopened_by) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: companies companies_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.companies
    ADD CONSTRAINT companies_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL;


--
-- Name: companies companies_owner_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.companies
    ADD CONSTRAINT companies_owner_member_id_fkey FOREIGN KEY (owner_member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL;


--
-- Name: companies companies_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.companies
    ADD CONSTRAINT companies_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL;


--
-- Name: companies companies_sync_run_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.companies
    ADD CONSTRAINT companies_sync_run_id_fkey FOREIGN KEY (sync_run_id) REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL;


--
-- Name: contacts contacts_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.contacts
    ADD CONSTRAINT contacts_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL;


--
-- Name: contacts contacts_company_record_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.contacts
    ADD CONSTRAINT contacts_company_record_id_fkey FOREIGN KEY (company_record_id) REFERENCES greenhouse_crm.companies(company_record_id) ON DELETE SET NULL;


--
-- Name: contacts contacts_linked_identity_profile_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.contacts
    ADD CONSTRAINT contacts_linked_identity_profile_id_fkey FOREIGN KEY (linked_identity_profile_id) REFERENCES greenhouse_core.identity_profiles(profile_id) ON DELETE SET NULL;


--
-- Name: contacts contacts_linked_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.contacts
    ADD CONSTRAINT contacts_linked_user_id_fkey FOREIGN KEY (linked_user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL;


--
-- Name: contacts contacts_owner_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.contacts
    ADD CONSTRAINT contacts_owner_member_id_fkey FOREIGN KEY (owner_member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL;


--
-- Name: contacts contacts_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.contacts
    ADD CONSTRAINT contacts_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL;


--
-- Name: contacts contacts_sync_run_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.contacts
    ADD CONSTRAINT contacts_sync_run_id_fkey FOREIGN KEY (sync_run_id) REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL;


--
-- Name: deals deals_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.deals
    ADD CONSTRAINT deals_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL;


--
-- Name: deals deals_company_record_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.deals
    ADD CONSTRAINT deals_company_record_id_fkey FOREIGN KEY (company_record_id) REFERENCES greenhouse_crm.companies(company_record_id) ON DELETE SET NULL;


--
-- Name: deals deals_module_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.deals
    ADD CONSTRAINT deals_module_id_fkey FOREIGN KEY (module_id) REFERENCES greenhouse_core.service_modules(module_id) ON DELETE SET NULL;


--
-- Name: deals deals_owner_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.deals
    ADD CONSTRAINT deals_owner_member_id_fkey FOREIGN KEY (owner_member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL;


--
-- Name: deals deals_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.deals
    ADD CONSTRAINT deals_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL;


--
-- Name: deals deals_sync_run_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_crm; Owner: -
--

ALTER TABLE ONLY greenhouse_crm.deals
    ADD CONSTRAINT deals_sync_run_id_fkey FOREIGN KEY (sync_run_id) REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL;


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL;


--
-- Name: projects projects_module_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.projects
    ADD CONSTRAINT projects_module_id_fkey FOREIGN KEY (module_id) REFERENCES greenhouse_core.service_modules(module_id) ON DELETE SET NULL;


--
-- Name: projects projects_owner_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.projects
    ADD CONSTRAINT projects_owner_member_id_fkey FOREIGN KEY (owner_member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL;


--
-- Name: projects projects_space_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.projects
    ADD CONSTRAINT projects_space_id_fkey FOREIGN KEY (space_id) REFERENCES greenhouse_core.notion_workspaces(space_id) ON DELETE SET NULL;


--
-- Name: projects projects_sync_run_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.projects
    ADD CONSTRAINT projects_sync_run_id_fkey FOREIGN KEY (sync_run_id) REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL;


--
-- Name: sprints sprints_project_record_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.sprints
    ADD CONSTRAINT sprints_project_record_id_fkey FOREIGN KEY (project_record_id) REFERENCES greenhouse_delivery.projects(project_record_id) ON DELETE SET NULL;


--
-- Name: sprints sprints_space_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.sprints
    ADD CONSTRAINT sprints_space_id_fkey FOREIGN KEY (space_id) REFERENCES greenhouse_core.notion_workspaces(space_id) ON DELETE SET NULL;


--
-- Name: sprints sprints_sync_run_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.sprints
    ADD CONSTRAINT sprints_sync_run_id_fkey FOREIGN KEY (sync_run_id) REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL;


--
-- Name: staff_aug_events staff_aug_events_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_events
    ADD CONSTRAINT staff_aug_events_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: staff_aug_events staff_aug_events_placement_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_events
    ADD CONSTRAINT staff_aug_events_placement_id_fkey FOREIGN KEY (placement_id) REFERENCES greenhouse_delivery.staff_aug_placements(placement_id) ON DELETE CASCADE;


--
-- Name: staff_aug_onboarding_items staff_aug_onboarding_items_placement_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_onboarding_items
    ADD CONSTRAINT staff_aug_onboarding_items_placement_id_fkey FOREIGN KEY (placement_id) REFERENCES greenhouse_delivery.staff_aug_placements(placement_id) ON DELETE CASCADE;


--
-- Name: staff_aug_onboarding_items staff_aug_onboarding_items_verified_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_onboarding_items
    ADD CONSTRAINT staff_aug_onboarding_items_verified_by_user_id_fkey FOREIGN KEY (verified_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: staff_aug_placements staff_aug_placements_assignment_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES greenhouse_core.client_team_assignments(assignment_id) ON DELETE CASCADE;


--
-- Name: staff_aug_placements staff_aug_placements_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id) ON DELETE CASCADE;


--
-- Name: staff_aug_placements staff_aug_placements_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: staff_aug_placements staff_aug_placements_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE;


--
-- Name: staff_aug_placements staff_aug_placements_organization_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES greenhouse_core.organizations(organization_id) ON DELETE SET NULL;


--
-- Name: staff_aug_placements staff_aug_placements_provider_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES greenhouse_core.providers(provider_id) ON DELETE SET NULL;


--
-- Name: staff_aug_placements staff_aug_placements_service_module_assignment_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_service_module_assignment_id_fkey FOREIGN KEY (service_module_assignment_id) REFERENCES greenhouse_core.client_service_modules(assignment_id) ON DELETE SET NULL;


--
-- Name: staff_aug_placements staff_aug_placements_space_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_space_id_fkey FOREIGN KEY (space_id) REFERENCES greenhouse_core.spaces(space_id) ON DELETE SET NULL;


--
-- Name: staff_aug_placements staff_aug_placements_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.staff_aug_placements
    ADD CONSTRAINT staff_aug_placements_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: tasks tasks_assignee_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.tasks
    ADD CONSTRAINT tasks_assignee_member_id_fkey FOREIGN KEY (assignee_member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE SET NULL;


--
-- Name: tasks tasks_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.tasks
    ADD CONSTRAINT tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id) ON DELETE SET NULL;


--
-- Name: tasks tasks_module_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.tasks
    ADD CONSTRAINT tasks_module_id_fkey FOREIGN KEY (module_id) REFERENCES greenhouse_core.service_modules(module_id) ON DELETE SET NULL;


--
-- Name: tasks tasks_project_record_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.tasks
    ADD CONSTRAINT tasks_project_record_id_fkey FOREIGN KEY (project_record_id) REFERENCES greenhouse_delivery.projects(project_record_id) ON DELETE SET NULL;


--
-- Name: tasks tasks_space_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.tasks
    ADD CONSTRAINT tasks_space_id_fkey FOREIGN KEY (space_id) REFERENCES greenhouse_core.notion_workspaces(space_id) ON DELETE SET NULL;


--
-- Name: tasks tasks_sprint_record_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.tasks
    ADD CONSTRAINT tasks_sprint_record_id_fkey FOREIGN KEY (sprint_record_id) REFERENCES greenhouse_delivery.sprints(sprint_record_id) ON DELETE SET NULL;


--
-- Name: tasks tasks_sync_run_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_delivery; Owner: -
--

ALTER TABLE ONLY greenhouse_delivery.tasks
    ADD CONSTRAINT tasks_sync_run_id_fkey FOREIGN KEY (sync_run_id) REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL;


--
-- Name: accounts accounts_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.accounts
    ADD CONSTRAINT accounts_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: bank_statement_rows bank_statement_rows_matched_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.bank_statement_rows
    ADD CONSTRAINT bank_statement_rows_matched_by_user_id_fkey FOREIGN KEY (matched_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: bank_statement_rows bank_statement_rows_period_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.bank_statement_rows
    ADD CONSTRAINT bank_statement_rows_period_id_fkey FOREIGN KEY (period_id) REFERENCES greenhouse_finance.reconciliation_periods(period_id) ON DELETE CASCADE;


--
-- Name: client_profiles client_profiles_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.client_profiles
    ADD CONSTRAINT client_profiles_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id);


--
-- Name: client_profiles client_profiles_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.client_profiles
    ADD CONSTRAINT client_profiles_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: client_profiles client_profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.client_profiles
    ADD CONSTRAINT client_profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES greenhouse_core.organizations(organization_id);


--
-- Name: cost_allocations cost_allocations_expense_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.cost_allocations
    ADD CONSTRAINT cost_allocations_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES greenhouse_finance.expenses(expense_id);


--
-- Name: expenses expenses_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.expenses
    ADD CONSTRAINT expenses_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id);


--
-- Name: expenses expenses_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.expenses
    ADD CONSTRAINT expenses_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: expenses expenses_direct_overhead_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.expenses
    ADD CONSTRAINT expenses_direct_overhead_member_id_fkey FOREIGN KEY (direct_overhead_member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: expenses expenses_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.expenses
    ADD CONSTRAINT expenses_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: expenses expenses_payment_account_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.expenses
    ADD CONSTRAINT expenses_payment_account_id_fkey FOREIGN KEY (payment_account_id) REFERENCES greenhouse_finance.accounts(account_id);


--
-- Name: expenses expenses_space_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.expenses
    ADD CONSTRAINT expenses_space_id_fkey FOREIGN KEY (space_id) REFERENCES greenhouse_core.spaces(space_id);


--
-- Name: expenses expenses_supplier_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.expenses
    ADD CONSTRAINT expenses_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES greenhouse_finance.suppliers(supplier_id);


--
-- Name: factoring_operations factoring_operations_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.factoring_operations
    ADD CONSTRAINT factoring_operations_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: factoring_operations factoring_operations_factoring_provider_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.factoring_operations
    ADD CONSTRAINT factoring_operations_factoring_provider_id_fkey FOREIGN KEY (factoring_provider_id) REFERENCES greenhouse_core.providers(provider_id);


--
-- Name: factoring_operations factoring_operations_income_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.factoring_operations
    ADD CONSTRAINT factoring_operations_income_id_fkey FOREIGN KEY (income_id) REFERENCES greenhouse_finance.income(income_id) ON DELETE CASCADE;


--
-- Name: purchase_orders greenhouse_purchase_orders_attachment_asset_fk; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.purchase_orders
    ADD CONSTRAINT greenhouse_purchase_orders_attachment_asset_fk FOREIGN KEY (attachment_asset_id) REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL;


--
-- Name: income income_client_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income
    ADD CONSTRAINT income_client_id_fkey FOREIGN KEY (client_id) REFERENCES greenhouse_core.clients(client_id);


--
-- Name: income income_client_profile_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income
    ADD CONSTRAINT income_client_profile_id_fkey FOREIGN KEY (client_profile_id) REFERENCES greenhouse_finance.client_profiles(client_profile_id);


--
-- Name: income income_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income
    ADD CONSTRAINT income_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: income income_organization_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income
    ADD CONSTRAINT income_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES greenhouse_core.organizations(organization_id);


--
-- Name: income_payments income_payments_income_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income_payments
    ADD CONSTRAINT income_payments_income_id_fkey FOREIGN KEY (income_id) REFERENCES greenhouse_finance.income(income_id) ON DELETE CASCADE;


--
-- Name: income_payments income_payments_payment_account_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income_payments
    ADD CONSTRAINT income_payments_payment_account_id_fkey FOREIGN KEY (payment_account_id) REFERENCES greenhouse_finance.accounts(account_id);


--
-- Name: income_payments income_payments_reconciled_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income_payments
    ADD CONSTRAINT income_payments_reconciled_by_user_id_fkey FOREIGN KEY (reconciled_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: income_payments income_payments_recorded_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.income_payments
    ADD CONSTRAINT income_payments_recorded_by_user_id_fkey FOREIGN KEY (recorded_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: reconciliation_periods reconciliation_periods_account_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.reconciliation_periods
    ADD CONSTRAINT reconciliation_periods_account_id_fkey FOREIGN KEY (account_id) REFERENCES greenhouse_finance.accounts(account_id);


--
-- Name: reconciliation_periods reconciliation_periods_reconciled_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.reconciliation_periods
    ADD CONSTRAINT reconciliation_periods_reconciled_by_user_id_fkey FOREIGN KEY (reconciled_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: service_entry_sheets service_entry_sheets_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.service_entry_sheets
    ADD CONSTRAINT service_entry_sheets_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES greenhouse_finance.purchase_orders(po_id);


--
-- Name: suppliers suppliers_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.suppliers
    ADD CONSTRAINT suppliers_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: suppliers suppliers_organization_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.suppliers
    ADD CONSTRAINT suppliers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES greenhouse_core.organizations(organization_id);


--
-- Name: suppliers suppliers_provider_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_finance; Owner: -
--

ALTER TABLE ONLY greenhouse_finance.suppliers
    ADD CONSTRAINT suppliers_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES greenhouse_core.providers(provider_id);


--
-- Name: leave_requests greenhouse_leave_requests_attachment_asset_fk; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_requests
    ADD CONSTRAINT greenhouse_leave_requests_attachment_asset_fk FOREIGN KEY (attachment_asset_id) REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL;


--
-- Name: leave_balances leave_balances_leave_type_code_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_balances
    ADD CONSTRAINT leave_balances_leave_type_code_fkey FOREIGN KEY (leave_type_code) REFERENCES greenhouse_hr.leave_types(leave_type_code);


--
-- Name: leave_balances leave_balances_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_balances
    ADD CONSTRAINT leave_balances_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE;


--
-- Name: leave_balances leave_balances_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_balances
    ADD CONSTRAINT leave_balances_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: leave_policies leave_policies_leave_type_code_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_policies
    ADD CONSTRAINT leave_policies_leave_type_code_fkey FOREIGN KEY (leave_type_code) REFERENCES greenhouse_hr.leave_types(leave_type_code) ON DELETE CASCADE;


--
-- Name: leave_request_actions leave_request_actions_actor_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_request_actions
    ADD CONSTRAINT leave_request_actions_actor_member_id_fkey FOREIGN KEY (actor_member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: leave_request_actions leave_request_actions_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_request_actions
    ADD CONSTRAINT leave_request_actions_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: leave_request_actions leave_request_actions_request_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_request_actions
    ADD CONSTRAINT leave_request_actions_request_id_fkey FOREIGN KEY (request_id) REFERENCES greenhouse_hr.leave_requests(request_id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_requests
    ADD CONSTRAINT leave_requests_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: leave_requests leave_requests_hr_reviewer_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_requests
    ADD CONSTRAINT leave_requests_hr_reviewer_user_id_fkey FOREIGN KEY (hr_reviewer_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: leave_requests leave_requests_leave_type_code_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_requests
    ADD CONSTRAINT leave_requests_leave_type_code_fkey FOREIGN KEY (leave_type_code) REFERENCES greenhouse_hr.leave_types(leave_type_code);


--
-- Name: leave_requests leave_requests_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_requests
    ADD CONSTRAINT leave_requests_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_supervisor_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.leave_requests
    ADD CONSTRAINT leave_requests_supervisor_member_id_fkey FOREIGN KEY (supervisor_member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: workflow_approval_snapshots workflow_approval_snapshots_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.workflow_approval_snapshots
    ADD CONSTRAINT workflow_approval_snapshots_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: workflow_approval_snapshots workflow_approval_snapshots_delegate_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.workflow_approval_snapshots
    ADD CONSTRAINT workflow_approval_snapshots_delegate_member_id_fkey FOREIGN KEY (delegate_member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: workflow_approval_snapshots workflow_approval_snapshots_delegate_responsibility_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.workflow_approval_snapshots
    ADD CONSTRAINT workflow_approval_snapshots_delegate_responsibility_id_fkey FOREIGN KEY (delegate_responsibility_id) REFERENCES greenhouse_core.operational_responsibilities(responsibility_id) ON DELETE SET NULL;


--
-- Name: workflow_approval_snapshots workflow_approval_snapshots_effective_approver_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.workflow_approval_snapshots
    ADD CONSTRAINT workflow_approval_snapshots_effective_approver_member_id_fkey FOREIGN KEY (effective_approver_member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: workflow_approval_snapshots workflow_approval_snapshots_formal_approver_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.workflow_approval_snapshots
    ADD CONSTRAINT workflow_approval_snapshots_formal_approver_member_id_fkey FOREIGN KEY (formal_approver_member_id) REFERENCES greenhouse_core.members(member_id);


--
-- Name: workflow_approval_snapshots workflow_approval_snapshots_override_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.workflow_approval_snapshots
    ADD CONSTRAINT workflow_approval_snapshots_override_actor_user_id_fkey FOREIGN KEY (override_actor_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: workflow_approval_snapshots workflow_approval_snapshots_subject_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_hr; Owner: -
--

ALTER TABLE ONLY greenhouse_hr.workflow_approval_snapshots
    ADD CONSTRAINT workflow_approval_snapshots_subject_member_id_fkey FOREIGN KEY (subject_member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE;


--
-- Name: compensation_versions compensation_versions_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.compensation_versions
    ADD CONSTRAINT compensation_versions_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: compensation_versions compensation_versions_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.compensation_versions
    ADD CONSTRAINT compensation_versions_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE;


--
-- Name: payroll_export_packages greenhouse_payroll_export_packages_csv_asset_fk; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_export_packages
    ADD CONSTRAINT greenhouse_payroll_export_packages_csv_asset_fk FOREIGN KEY (csv_asset_id) REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL;


--
-- Name: payroll_export_packages greenhouse_payroll_export_packages_pdf_asset_fk; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_export_packages
    ADD CONSTRAINT greenhouse_payroll_export_packages_pdf_asset_fk FOREIGN KEY (pdf_asset_id) REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL;


--
-- Name: payroll_receipts greenhouse_payroll_receipts_asset_fk; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_receipts
    ADD CONSTRAINT greenhouse_payroll_receipts_asset_fk FOREIGN KEY (asset_id) REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL;


--
-- Name: payroll_entries payroll_entries_compensation_version_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_entries
    ADD CONSTRAINT payroll_entries_compensation_version_id_fkey FOREIGN KEY (compensation_version_id) REFERENCES greenhouse_payroll.compensation_versions(version_id);


--
-- Name: payroll_entries payroll_entries_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_entries
    ADD CONSTRAINT payroll_entries_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE;


--
-- Name: payroll_entries payroll_entries_period_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_entries
    ADD CONSTRAINT payroll_entries_period_id_fkey FOREIGN KEY (period_id) REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE;


--
-- Name: payroll_export_packages payroll_export_packages_period_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_export_packages
    ADD CONSTRAINT payroll_export_packages_period_id_fkey FOREIGN KEY (period_id) REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE;


--
-- Name: payroll_periods payroll_periods_approved_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_periods
    ADD CONSTRAINT payroll_periods_approved_by_user_id_fkey FOREIGN KEY (approved_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: payroll_periods payroll_periods_calculated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_periods
    ADD CONSTRAINT payroll_periods_calculated_by_user_id_fkey FOREIGN KEY (calculated_by_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: payroll_receipts payroll_receipts_entry_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_receipts
    ADD CONSTRAINT payroll_receipts_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES greenhouse_payroll.payroll_entries(entry_id) ON DELETE CASCADE;


--
-- Name: payroll_receipts payroll_receipts_member_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_receipts
    ADD CONSTRAINT payroll_receipts_member_id_fkey FOREIGN KEY (member_id) REFERENCES greenhouse_core.members(member_id) ON DELETE CASCADE;


--
-- Name: payroll_receipts payroll_receipts_period_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.payroll_receipts
    ADD CONSTRAINT payroll_receipts_period_id_fkey FOREIGN KEY (period_id) REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE;


--
-- Name: projected_payroll_promotions projected_payroll_promotions_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.projected_payroll_promotions
    ADD CONSTRAINT projected_payroll_promotions_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES greenhouse_core.client_users(user_id);


--
-- Name: projected_payroll_promotions projected_payroll_promotions_period_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_payroll; Owner: -
--

ALTER TABLE ONLY greenhouse_payroll.projected_payroll_promotions
    ADD CONSTRAINT projected_payroll_promotions_period_id_fkey FOREIGN KEY (period_id) REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE;


--
-- Name: staff_aug_placement_snapshots staff_aug_placement_snapshots_placement_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_serving; Owner: -
--

ALTER TABLE ONLY greenhouse_serving.staff_aug_placement_snapshots
    ADD CONSTRAINT staff_aug_placement_snapshots_placement_id_fkey FOREIGN KEY (placement_id) REFERENCES greenhouse_delivery.staff_aug_placements(placement_id) ON DELETE CASCADE;


--
-- Name: service_sync_queue service_sync_queue_service_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.service_sync_queue
    ADD CONSTRAINT service_sync_queue_service_id_fkey FOREIGN KEY (service_id) REFERENCES greenhouse_core.services(service_id);


--
-- Name: source_sync_failures source_sync_failures_sync_run_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.source_sync_failures
    ADD CONSTRAINT source_sync_failures_sync_run_id_fkey FOREIGN KEY (sync_run_id) REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE CASCADE;


--
-- Name: source_sync_watermarks source_sync_watermarks_sync_run_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.source_sync_watermarks
    ADD CONSTRAINT source_sync_watermarks_sync_run_id_fkey FOREIGN KEY (sync_run_id) REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL;


--
-- Name: webhook_deliveries webhook_deliveries_webhook_subscription_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_webhook_subscription_id_fkey FOREIGN KEY (webhook_subscription_id) REFERENCES greenhouse_sync.webhook_subscriptions(webhook_subscription_id);


--
-- Name: webhook_delivery_attempts webhook_delivery_attempts_webhook_delivery_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.webhook_delivery_attempts
    ADD CONSTRAINT webhook_delivery_attempts_webhook_delivery_id_fkey FOREIGN KEY (webhook_delivery_id) REFERENCES greenhouse_sync.webhook_deliveries(webhook_delivery_id);


--
-- Name: webhook_inbox_events webhook_inbox_events_webhook_endpoint_id_fkey; Type: FK CONSTRAINT; Schema: greenhouse_sync; Owner: -
--

ALTER TABLE ONLY greenhouse_sync.webhook_inbox_events
    ADD CONSTRAINT webhook_inbox_events_webhook_endpoint_id_fkey FOREIGN KEY (webhook_endpoint_id) REFERENCES greenhouse_sync.webhook_endpoints(webhook_endpoint_id);


--
-- PostgreSQL database dump complete
--

\unrestrict bs3NERE9Z8mfcsVKfRwiXdjgVtodi58paZxqi9QdWLTXKokz7wrRmHe97p5Sq8P
