'use client'

// React Imports
import { useState } from 'react'
import type { ComponentType } from 'react'

type OpenDialogOnElementClickProps = {
  element: ComponentType<any>
  dialog: ComponentType<any>
  elementProps?: any
  dialogProps?: any
}

const OpenDialogOnElementClick = (props: OpenDialogOnElementClickProps) => {
  const { element: Element, dialog: Dialog, elementProps, dialogProps } = props

  const [open, setOpen] = useState(false)

  const { onClick: elementOnClick, ...restElementProps } = elementProps ?? {}

  const handleOnClick = (e: MouseEvent) => {
    elementOnClick?.(e)
    setOpen(true)
  }

  return (
    <>
      <Element onClick={handleOnClick} {...restElementProps} />
      <Dialog open={open} setOpen={setOpen} {...dialogProps} closeAfterTransition={false} />
    </>
  )
}

export default OpenDialogOnElementClick
