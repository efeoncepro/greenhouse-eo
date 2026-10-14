'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import GreenhouseButton from '@/components/greenhouse/primitives/GreenhouseButton'
import GreenhouseChip from '@/components/greenhouse/primitives/GreenhouseChip'
import { GH_GROWTH_MEASUREMENT as C } from '@/lib/copy/growth-measurement'
import { MEASUREMENT_ORIGINS } from '@/lib/growth/measurement/policy-contract'

import { measurementScopeKey as scopeKey, type MeasurementCatalog } from './measurement-policy-client'
import { useMeasurementPolicy } from './useMeasurementPolicy'

const targets = ['email','phone','firstName','lastName'] as const

export default function MeasurementPolicyPanel({ preferredFormSlug, initialCatalog }: { preferredFormSlug?: string; initialCatalog?: MeasurementCatalog } = {}) {
  const model = useMeasurementPolicy(preferredFormSlug, initialCatalog)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const { catalog, source, revision, published, config, busy, unresolved, editing, issue } = model
  const locked = busy || unresolved
  const sourceGone = Boolean(model.selected && !source)
  const errorMessage = issue?.kind === 'denied' ? C.denied : issue?.kind === 'conflict' ? C.conflict : issue?.kind === 'invalid' ? C.invalid : catalog ? C.error : C.unavailable
  const reasons = [...new Set([...model.blockers, ...(issue?.reasons ?? [])])]
  const canReview = !editing && revision?.state === 'draft'
  const canPublish = !editing && revision?.state === 'review'
  const showEdit = !editing && source && catalog?.permissions.author
  const canDisable = Boolean(published && catalog?.permissions.disable)

  return (
    <Box component='section' data-surface-recipe='settings-flow' aria-labelledby='measurement-policy-heading'
      data-capture='measurement-policy-panel' data-state={!catalog ? issue ? 'error' : 'loading' : 'ready'}
      sx={{ p:2, borderTop:1, borderColor:'divider', minWidth:0,
        '& .MuiButton-text, & .MuiButton-outlined, & .MuiAlert-message': {color:'text.primary'},
        '& .MuiSelect-select:focus-visible': { outline:theme=>`2px solid ${theme.palette.primary.main}`, outlineOffset:2 },
        '& .MuiSwitch-root:focus-within, & .MuiCheckbox-root:focus-within': { outline:theme=>`2px solid ${theme.palette.primary.main}`, outlineOffset:2 },
      }}>
      <Stack spacing={2}>
        <Box><Typography id='measurement-policy-heading' variant='subtitle1' color='text.primary'>{C.title}</Typography><Typography variant='body2' color='text.secondary'>{C.description}</Typography></Box>
        {issue && <Alert severity={issue.kind === 'conflict' ? 'warning' : 'error'}>{errorMessage}</Alert>}
        <Box aria-live='polite' aria-atomic='true'>
          {busy ? <Typography variant='body2' role='status'>{C.pending}</Typography> : model.verified ? <Typography variant='body2' role='status'>{C.saved}</Typography> : null}
        </Box>
        {!catalog ? <>
          {!issue && <Typography role='status'>{C.loading}</Typography>}
          {issue && issue.kind !== 'denied' && <GreenhouseButton variant='outlined' size='small' onClick={()=>void model.reload()} disabled={busy}>{C.retry}</GreenhouseButton>}
        </> : !catalog.permissions.read ? <Alert severity='info'>{C.denied}</Alert> : <>
          {!catalog.sources.length && !model.selected ? <Typography variant='body2'>{C.noSources}</Typography> : <>
            <TextField select fullWidth size='small' label={C.source} value={model.selected} disabled={locked}
              onChange={event=>{setConfirmDisable(false);model.requestSource(event.target.value)}}
              helperText={source ? `${source.name} · ${source.origins.map(origin=>new URL(origin).hostname).join(', ')}` : C.notAvailable}>
              {sourceGone && <MenuItem value={model.selected}>{C.notAvailable}</MenuItem>}
              {catalog.sources.map(item=><MenuItem key={scopeKey(item.scope)} value={scopeKey(item.scope)} sx={{whiteSpace:'normal'}}>
                {item.name} · {item.scope.sourceKind === 'meeting_booking' ? C.meetingType : C.formType} · {item.origins.map(origin=>new URL(origin).hostname).join(', ')}
              </MenuItem>)}
            </TextField>
            {model.pendingSource && <Alert severity='warning'><Stack spacing={1}>
              <Typography variant='body2'>{C.confirmDiscard}</Typography><Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                <GreenhouseButton variant='outlined' size='small' onClick={model.discardSource}>{C.discard}</GreenhouseButton>
                <GreenhouseButton variant='text' size='small' onClick={model.keepSource}>{C.keepEditing}</GreenhouseButton>
              </Stack></Stack></Alert>}
            {published ? <Typography variant='body2' color='text.secondary'>{C.activeRevision(published.revision)}</Typography> : <Typography variant='body2' color='text.secondary'>{revision ? C.noActive : C.empty}</Typography>}
            {revision && <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
              <GreenhouseChip kind='status' size='small' variant='label' label={C.states[revision.state]} />
              <Typography variant='caption' color='text.secondary'>{C.revision(revision.revision)}</Typography>
            </Stack>}
            {source && config && <>
              {editing && <Typography variant='body2' color='text.secondary'>{published ? C.configurationInUse : C.draftHelp}</Typography>}
              {canPublish && <Typography variant='body2' color='text.secondary'>{C.reviewSummary}</Typography>}
              <Box component='fieldset' disabled={!editing || locked || !catalog.permissions.author} sx={{border:0,p:0,m:0,minWidth:0}}>
                <Typography component='legend' variant='subtitle2' color='text.primary'>{C.mapping}</Typography>
                <Stack spacing={2} sx={{mt:2}}>
                  {targets.map(target=>{
                    const options=source.fields.filter(field=>field.type === (target === 'email' ? 'email' : target === 'phone' ? 'tel' : 'text'))
                    const value=config.mapping[target] ?? ''

                    return <TextField key={target} select size='small' fullWidth label={C[target]} value={value} disabled={!editing || locked || !catalog.permissions.author}
                      onChange={event=>{
                        const mapping={...config.mapping}

                        if(event.target.value) mapping[target]=event.target.value
                        else delete mapping[target]
                        model.update({...config,mapping})
                      }}>
                      <MenuItem value=''>{C.none}</MenuItem>
                      {value && !options.some(field=>field.key===value) && <MenuItem value={value} disabled>{value} · {C.notAvailable}</MenuItem>}
                      {options.map(field=><MenuItem key={field.key} value={field.key}>{field.key}</MenuItem>)}
                    </TextField>
                  })}
                  <Box><Typography variant='subtitle2' color='text.primary'>{C.origins}</Typography>
                    {MEASUREMENT_ORIGINS.filter(origin=>source.origins.includes(origin)).map(origin=><FormControlLabel key={origin} sx={{maxWidth:'100%', '& .MuiFormControlLabel-label':{overflowWrap:'anywhere'}}}
                      label={new URL(origin).hostname} control={<Checkbox disabled={!editing || locked || !catalog.permissions.author} checked={config.origins.includes(origin)} onChange={event=>model.update({...config,origins:event.target.checked?[...config.origins,origin]:config.origins.filter(value=>value!==origin)})} />} />)}
                    <Typography variant='caption' color='text.secondary'>{C.originsHelp}</Typography>
                  </Box>
                  <Box><Typography variant='subtitle2' color='text.primary'>{C.destinations}</Typography>
                    {(['meta','google_upd'] as const).map(destination=><FormControlLabel key={destination} label={C[destination]} control={<Switch disabled={!editing || locked || !catalog.permissions.author} checked={config.destinations.includes(destination)}
                      onChange={event=>model.update({...config,destinations:event.target.checked?[...config.destinations,destination]:config.destinations.filter(value=>value!==destination)})} />} />)}
                  </Box>
                </Stack>
              </Box>
            </>}
            {reasons.length > 0 && <Alert severity='warning'><Stack spacing={1}>{reasons.map(reason=><Typography key={reason} variant='body2'>{C.blockers[reason] ?? C.blocked}</Typography>)}</Stack></Alert>}
            {unresolved && !busy && <Alert severity='warning'>{C.unresolved}</Alert>}
            <Stack data-capture='measurement-policy-actions' spacing={1}>
              {unresolved ? <GreenhouseButton variant='solid' size='small' disabled={busy} onClick={model.retry}>{C.retry}</GreenhouseButton> : <>
                {editing && <GreenhouseButton variant='solid' size='small' disabled={busy || reasons.length>0 || !catalog.permissions.author} onClick={()=>model.command('draft')}>{C.save}</GreenhouseButton>}
                {canReview && <GreenhouseButton variant='solid' size='small' disabled={busy || reasons.length>0 || !catalog.permissions.author} onClick={()=>model.command('review')}>{C.review}</GreenhouseButton>}
                {canReview && !catalog.permissions.author && <Typography variant='body2'>{C.noReviewPermission}</Typography>}
                {canPublish && <GreenhouseButton variant='solid' size='small' disabled={busy || reasons.length>0 || !config?.destinations.length || !catalog.permissions.publish} onClick={()=>model.command('publish')}>{C.publish}</GreenhouseButton>}
                {canPublish && !config?.destinations.length && <Typography variant='body2'>{C.noDestination}</Typography>}
                {canPublish && !catalog.permissions.publish && <Typography variant='body2'>{C.noPublishPermission}</Typography>}
                {showEdit && <GreenhouseButton variant={canReview || canPublish ? 'text' : 'outlined'} size='small' disabled={busy} onClick={()=>{setConfirmDisable(false);model.edit()}}>{C.edit}</GreenhouseButton>}
                {editing && revision && <GreenhouseButton variant='text' size='small' disabled={busy} onClick={model.cancelEdit}>{C.cancel}</GreenhouseButton>}
                {!catalog.permissions.author && !catalog.permissions.publish && !catalog.permissions.disable && <Typography variant='body2'>{C.readOnly}</Typography>}
                <GreenhouseButton variant='text' size='small' disabled={busy} onClick={()=>void model.reload()}>{C.reload}</GreenhouseButton>
                {canDisable && !confirmDisable && <GreenhouseButton variant='outlined' tone='error' size='small' disabled={busy} onClick={()=>setConfirmDisable(true)}>{C.disable}</GreenhouseButton>}
                {canDisable && confirmDisable && <Alert severity='warning'><Stack spacing={1}>
                  <Typography variant='body2'>{C.confirmDisable}</Typography>
                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                    <GreenhouseButton variant='outlined' tone='error' size='small' disabled={busy} onClick={()=>{setConfirmDisable(false);model.command('disable',published)}}>{C.confirming}</GreenhouseButton>
                    <GreenhouseButton variant='text' size='small' disabled={busy} onClick={()=>setConfirmDisable(false)}>{C.cancel}</GreenhouseButton>
                  </Stack>
                </Stack></Alert>}
              </>}
            </Stack>
          </>}
        </>}
      </Stack>
    </Box>
  )
}
