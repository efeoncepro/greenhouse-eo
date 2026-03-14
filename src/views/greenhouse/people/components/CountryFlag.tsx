import Typography from '@mui/material/Typography'

import { countryLabel } from '../helpers'

type Props = {
  code: string | null
}

const CountryFlag = ({ code }: Props) => (
  <Typography variant='body2'>{countryLabel(code)}</Typography>
)

export default CountryFlag
