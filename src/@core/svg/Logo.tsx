// React Imports
import type { SVGAttributes } from 'react'

const Logo = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg width='1.25em' height='1.25em' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
      <path d='M4 13.2L16 4L28 13.2V26C28 27.1046 27.1046 28 26 28H6C4.89543 28 4 27.1046 4 26V13.2Z' fill='currentColor' />
      <path d='M10 16H22V28H10V16Z' fill='white' fillOpacity='0.14' />
      <path
        d='M16.2 11.2C18.9614 11.2 21.2 13.4386 21.2 16.2C21.2 20 18 22.4 13.6 22.4C13.6 18 16 14.8 19.8 14.8C19.457 12.8187 17.7398 11.2 15.6 11.2H16.2Z'
        fill='white'
        fillOpacity='0.96'
      />
      <path d='M16.4 16.2C14.9054 16.2 13.6 17.7724 13.6 20.4C16.2276 20.4 17.8 19.0946 17.8 17.6C17.8 16.8268 17.1732 16.2 16.4 16.2Z' fill='currentColor' fillOpacity='0.2' />
    </svg>
  )
}

export default Logo
