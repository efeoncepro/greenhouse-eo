import 'server-only'

import { getSiiRetentionRate } from '@/types/hr-contracts'

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export const calculateHonorariosTotals = ({
  periodDate,
  baseSalary,
  fixedBonusAmount,
  bonusOtdAmount,
  bonusRpaAmount,
  bonusOtherAmount
}: {
  periodDate: string
  baseSalary: number
  fixedBonusAmount: number
  bonusOtdAmount: number
  bonusRpaAmount: number
  bonusOtherAmount: number
}) => {
  const year = Number(periodDate.slice(0, 4))
  const siiRetentionRate = getSiiRetentionRate(year)
  const grossTotal = roundCurrency(baseSalary + fixedBonusAmount + bonusOtdAmount + bonusRpaAmount + bonusOtherAmount)
  const siiRetentionAmount = roundCurrency(grossTotal * siiRetentionRate)
  const netTotalCalculated = roundCurrency(grossTotal - siiRetentionAmount)

  return {
    grossTotal,
    siiRetentionRate,
    siiRetentionAmount,
    netTotalCalculated
  }
}
