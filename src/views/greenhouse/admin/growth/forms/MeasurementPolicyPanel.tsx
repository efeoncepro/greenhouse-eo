'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import GreenhouseButton from '@/components/greenhouse/primitives/GreenhouseButton'
import GreenhouseChip from '@/components/greenhouse/primitives/GreenhouseChip'
import { GH_GROWTH_MEASUREMENT as C } from '@/lib/copy/growth-measurement'
import type { MeasurementPolicyRevision, MeasurementPolicySource } from '@/lib/growth/measurement/policy-contract'

export type Catalog = { sources: MeasurementPolicySource[]; policies: MeasurementPolicyRevision[]; permissions: {read:boolean;author:boolean;publish:boolean;disable:boolean} }
const scopeKey = (source: MeasurementPolicySource['scope']) => `${source.sourceKind}:${source.sourceKey}:${source.surfaceId}`
const targets = ['email','phone','firstName','lastName'] as const

export default function MeasurementPolicyPanel({initialCatalog}:{initialCatalog?:Catalog}={}) {
  const [catalog,setCatalog]=useState<Catalog|null>(initialCatalog??null)
  const [error,setError]=useState<string|null>(null)
  const [selected,setSelected]=useState(initialCatalog?.sources[0]?scopeKey(initialCatalog.sources[0].scope):'')

  useEffect(()=>{
    if(initialCatalog) return
    const controller=new AbortController()

    fetch('/api/admin/growth/measurement',{signal:controller.signal}).then(async r=>{
      if(!r.ok) throw Error(r.status===403?C.denied:C.unavailable)
      const data=await r.json() as Catalog

      setCatalog(data);setSelected(data.sources[0]?scopeKey(data.sources[0].scope):'')
    }).catch(e=>{if(e.name!=='AbortError')setError(e.message===C.denied?C.denied:C.unavailable)})

    return ()=>controller.abort()
  },[initialCatalog])
  const source=catalog?.sources.find(s=>scopeKey(s.scope)===selected)
  const revision=catalog?.policies.find(p=>scopeKey(p.scope)===selected&&p.state==='published')

  return <Box component='section' data-surface-recipe='settings-flow' aria-labelledby='measurement-policy-heading' data-capture='measurement-policy-panel' data-state={error?'error':catalog?'ready':'loading'} sx={{p:2,borderTop:1,borderColor:'divider',minWidth:0,'& .MuiSelect-select:focus-visible':{outline:theme=>`2px solid ${theme.palette.primary.main}`,outlineOffset:2}}}>
    <Stack spacing={2}>
      <Box><Typography id='measurement-policy-heading' variant='subtitle1' color='text.primary'>{C.title}</Typography><Typography variant='body2' color='text.secondary'>{C.description}</Typography></Box>
      {error?<Alert severity='error'>{error}</Alert>:!catalog?<Typography role='status'>{C.loading}</Typography>:<>
        <TextField select fullWidth size='small' label={C.source} value={selected} onChange={e=>setSelected(e.target.value)}>
          {catalog.sources.map(s=><MenuItem key={scopeKey(s.scope)} value={scopeKey(s.scope)} sx={{whiteSpace:'normal'}}>{s.name} · {s.scope.surfaceId}</MenuItem>)}
        </TextField>
        {revision?<Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'><GreenhouseChip kind='status' size='small' variant='label' label={C.states[revision.state]} /><Typography variant='caption' color='text.secondary'>{C.revision(revision.revision)}</Typography></Stack>:<Typography variant='body2'>{C.empty}</Typography>}
        {source?<><Typography variant='caption' color='text.secondary'>{C.origins}: {source.origins.join(', ')}</Typography>
          <Typography variant='subtitle2' color='text.primary'>{C.mapping}</Typography>
          {targets.map(target=><TextField key={target} select size='small' fullWidth label={C[target]} value={revision?.config.mapping[target]??''}>
            <MenuItem value=''>{C.none}</MenuItem>{source.fields.filter(f=>f.type===(target==='email'?'email':target==='phone'?'tel':'text')).map(f=><MenuItem key={f.key} value={f.key}>{f.key}</MenuItem>)}
          </TextField>)}
          <Box><Typography variant='subtitle2' color='text.primary'>{C.destinations}</Typography>{(['meta','google_upd'] as const).map(d=><FormControlLabel key={d} label={C[d]} control={<Switch checked={revision?.config.destinations.includes(d)??false} />} />)}</Box>
          <GreenhouseButton variant='solid' size='small' disabled>{C.save}</GreenhouseButton>
        </>:null}
      </>}
    </Stack>
  </Box>
}
