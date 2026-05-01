export const buildPayrollTaxTableVersion = (year: number, month: number) =>
  `gael-${year}-${String(month).padStart(2, '0')}`
