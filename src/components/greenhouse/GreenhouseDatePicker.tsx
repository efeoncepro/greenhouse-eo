'use client'

import { forwardRef } from 'react'

import type { ReactNode } from 'react'

import InputAdornment from '@mui/material/InputAdornment'

import CustomTextField from '@core/components/mui/TextField'

import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'

type GreenhouseDatePickerProps = {
  label: string
  value: Date | null
  onChange: (value: Date | null) => void
  placeholder?: string
  helperText?: ReactNode
  error?: boolean
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  showMonthYearPicker?: boolean
  dateFormat?: string
}

type DateInputProps = {
  value?: string
  onClick?: () => void
  label: string
  placeholder?: string
  helperText?: ReactNode
  error?: boolean
  disabled?: boolean
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { value, onClick, label, placeholder, helperText, error, disabled },
  ref
) {
  return (
    <CustomTextField
      fullWidth
      inputRef={ref}
      value={value ?? ''}
      onClick={onClick}
      label={label}
      placeholder={placeholder}
      helperText={helperText}
      error={error}
      disabled={disabled}
      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
      slotProps={{
        input: {
          readOnly: true,
          endAdornment: (
            <InputAdornment position='end'>
              <i className='tabler-calendar-event' />
            </InputAdornment>
          )
        }
      }}
    />
  )
})

const GreenhouseDatePicker = ({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  error = false,
  minDate,
  maxDate,
  disabled = false,
  showMonthYearPicker = false,
  dateFormat = showMonthYearPicker ? 'MM/yyyy' : 'dd/MM/yyyy'
}: GreenhouseDatePickerProps) => {
  return (
    <AppReactDatepicker
      selected={value}
      onChange={date => onChange(date)}
      minDate={minDate}
      maxDate={maxDate}
      disabled={disabled}
      dateFormat={dateFormat}
      showMonthYearPicker={showMonthYearPicker}
      customInput={
        <DateInput
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          error={error}
          disabled={disabled}
        />
      }
    />
  )
}

export default GreenhouseDatePicker
