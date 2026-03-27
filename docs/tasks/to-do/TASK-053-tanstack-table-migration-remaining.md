# TASK-053 — TanStack React Table Migration (Remaining 25 Tables)

## Estado

In Progress. 23 of 48 tables migrated by Claude Opus session. This task covers the remaining ~25 low-impact tables.

## Context

All tables in Greenhouse must use TanStack React Table v8 with Vuexy `tableStyles.table` for consistent sorting, search, and pagination. The migration pattern is established and documented in `Handoff.md`.

## Migration Pattern (reference: `AgencyTeamView.tsx`)

1. Replace MUI Table imports → TanStack + classnames + tableStyles
2. Define columns with `createColumnHelper<RowType>()`, type `ColumnDef<T, any>[]`
3. Add `[sorting, setSorting] = useState<SortingState>([])`
4. Create instance `useReactTable({ data, columns, state, ...Models })`
5. Replace `<TableContainer><Table>` → `<div className='overflow-x-auto'><table className={tableStyles.table}>`
6. For list views: add `CustomTextField` search + `TablePaginationComponent`
7. For detail/embedded: sort-only (no pagination)

## Files to Migrate

### Finance Detail Views
- [ ] `src/views/greenhouse/finance/IncomeDetailView.tsx` — payment history (small, sort-only)
- [ ] `src/views/greenhouse/finance/ClientDetailView.tsx` — 2 tables: invoices + deals (small)
- [ ] `src/views/greenhouse/finance/SupplierDetailView.tsx` — expense history
- [ ] `src/views/greenhouse/finance/FinanceDashboardView.tsx` — summary tables

### Org/People Tabs
- [ ] `src/views/greenhouse/organizations/tabs/OrganizationProjectsTab.tsx`
- [ ] `src/views/greenhouse/organizations/tabs/OrganizationFinanceTab.tsx`
- [ ] `src/views/greenhouse/organizations/tabs/OrganizationEconomicsTab.tsx`
- [ ] `src/views/greenhouse/organizations/tabs/OrganizationOverviewTab.tsx`
- [ ] `src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx`
- [ ] `src/views/greenhouse/people/tabs/PersonPayrollTab.tsx`
- [ ] `src/views/greenhouse/people/tabs/PersonFinanceTab.tsx`
- [ ] `src/views/greenhouse/people/tabs/PersonAiToolsTab.tsx`

### Payroll (non-EntryTable)
- [ ] `src/views/greenhouse/payroll/PayrollHistoryTab.tsx`
- [ ] `src/views/greenhouse/payroll/PayrollCompensationTab.tsx`
- [ ] `src/views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx`
- [ ] `src/views/greenhouse/payroll/PayrollReceiptCard.tsx`
- [ ] `src/views/greenhouse/payroll/MemberPayrollHistory.tsx`

### My/Collaborator Views
- [ ] `src/views/greenhouse/my/MyAssignmentsView.tsx`
- [ ] `src/views/greenhouse/my/MyPayrollView.tsx`
- [ ] `src/views/greenhouse/my/MyOrganizationView.tsx`

### Admin/Notifications
- [ ] `src/views/greenhouse/notifications/NotificationPreferencesView.tsx`
- [ ] `src/views/greenhouse/admin/tenants/TenantCrmPanel.tsx`
- [ ] `src/views/greenhouse/admin/tenants/TenantNotionPanel.tsx`
- [ ] `src/views/greenhouse/admin/tenants/TenantProjectsPanel.tsx`

### Client-facing
- [ ] `src/views/greenhouse/GreenhouseClientCampaignDetail.tsx`
- [ ] `src/views/greenhouse/GreenhouseProjectDetail.tsx`

## Acceptance Criteria

- [ ] All 25 files migrated to TanStack
- [ ] `npx tsc --noEmit` clean
- [ ] `pnpm build` clean
- [ ] No business logic changed — only table rendering

## Dependencies & Impact

- **Depende de:** Pattern established by Claude Opus session (AgencyTeamView.tsx reference)
- **Impacta a:** Visual consistency across entire portal
- **Archivos owned:** All files listed above
