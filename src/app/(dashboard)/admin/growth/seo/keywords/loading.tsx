import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'

/**
 * TASK-1308 — Loading instantáneo de la ruta.
 *
 * La página es `force-dynamic` y espera al reader más lento antes de pintar NADA: entre el
 * click en el tab y el primer píxel hay cuatro queries. Sin esto, cambiar de tab dejaba la
 * pantalla anterior congelada sin señal de que algo estaba pasando.
 *
 * ⚠️ El esqueleto está DIMENSIONADO al contenido real (banda de veredicto, card del mapa de
 * 380px, card de tabla), no a un rectángulo genérico: un skeleton que no coincide con lo
 * que llega produce un salto de layout justo cuando el usuario empieza a leer.
 *
 * ⚠️ Es el complemento del indicador "Actualizando…" de la propia vista, no su duplicado:
 * éste cubre la llegada a la ruta (sin datos todavía); aquél cubre el cambio de Space o de
 * ventana, donde SÍ hay datos en pantalla y taparlos con un esqueleto sería peor.
 */
const Loading = () => (
  <Stack spacing={6} role='status' aria-busy='true' aria-label={GH_GROWTH_SEO_KEYWORDS.loadingAria}>
    <Stack spacing={1}>
      <Skeleton variant='text' width={180} height={20} />
      <Skeleton variant='text' width={420} height={48} />
      <Skeleton variant='text' width={560} height={20} />
    </Stack>

    <Skeleton variant='rounded' height={44} width={480} />

    <Card>
      <CardContent>
        <Stack spacing={5}>
          <Stack spacing={2}>
            <Skeleton variant='text' width='55%' height={36} />
            <Skeleton variant='text' width={280} height={28} />
            <Skeleton variant='text' width='70%' height={20} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <Skeleton variant='rounded' height={56} sx={{ flex: 1 }} />
            <Skeleton variant='rounded' height={56} sx={{ flex: 1 }} />
            <Skeleton variant='rounded' height={56} sx={{ flex: 1 }} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>

    <Card>
      <CardContent>
        <Stack spacing={4}>
          <Skeleton variant='text' width={220} height={28} />
          <Skeleton variant='rounded' height={380} />
        </Stack>
      </CardContent>
    </Card>

    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Skeleton variant='text' width={140} height={28} />
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} variant='rounded' height={44} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  </Stack>
)

export default Loading
