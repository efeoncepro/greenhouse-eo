import type { HiringDeskCopy } from '../../types'

export const hiringDesk: HiringDeskCopy = {
  title: 'Hiring Desk',
  eyebrow: 'Equipo y talento',
  subtitle: 'Control room del pipeline de contratación — publica, evalúa y decide.',
  navigation: { demand: 'Demanda', pipeline: 'Pipeline', publication: 'Publicación' },
  common: {
    search: 'Buscar por rol, persona o ID', retry: 'Reintentar', cancel: 'Cancelar', save: 'Guardar',
    close: 'Cerrar', confirm: 'Confirmar', loading: 'Cargando…', noResults: 'Sin resultados',
    openApplication: 'Abrir postulación', previous: 'Anterior', next: 'Siguiente', agency: 'Agencia',
    demandFormRegion: 'Formulario de nueva demanda', createOptions: 'Más opciones de creación'
  },
  demand: {
    title: 'Demanda de talento', subtitle: 'Abre, prioriza y sigue cada búsqueda desde una vista operativa.',
    newDemand: 'Nueva demanda', activeDemands: 'Postulantes activos', openPositions: 'En evaluación',
    applicants: 'Por decidir', published: 'Contratados (mes)', role: 'Rol', area: 'Área', owner: 'Responsable', ownerSelf: 'Tú (sesión actual)',
    status: 'Estado', seats: 'Cupos', publication: 'Publicación', candidates: 'Postulantes', targetDate: 'Fecha objetivo',
    openingsTitle: 'Openings', openingsCaption: 'openings activos · foco del programa', emptyTitle: 'Aún no tienes demandas',
    emptyBody: 'Las demandas agrupan los openings por rol y rastrean sus postulantes de punta a punta.',
    filteredEmptyBody: 'Ningún opening coincide con tu búsqueda. Ajusta los filtros o limpia la búsqueda.', drawerTitle: 'Nueva demanda',
    drawerSubtitle: 'Define el cargo; lo publicas después desde Publicación.', templateLabel: 'Empezar desde una plantilla',
    templatePlaceholder: 'Sin plantilla', roleLabel: 'Título del cargo', areaLabel: 'Área', seniorityLabel: 'Seniority',
    skillsLabel: 'Skills', businessUnitLabel: 'Unidad', seatsLabel: 'Cupos',
    modeLabel: 'Modalidad', targetDateLabel: 'Fecha objetivo', summaryLabel: 'Resumen',
    internalCompensation: 'Compensación interna', compensationHint: 'Visible solo para el equipo de Hiring.',
    previewTitle: 'Vista previa', create: 'Crear demanda', createAndPublish: 'Crear y publicar',
    createAnother: 'Crear y agregar otra', discardTitle: '¿Descartar cambios?',
    discardBody: 'Tienes cambios sin guardar.', discard: 'Descartar', discardContinue: 'Seguir editando',
    drawerHint: 'La demanda queda en borrador. Publícala desde la pestaña Publicación cuando esté lista.',
    created: 'Demanda creada correctamente.'
  },
  pipeline: {
    title: 'Pipeline de postulantes', subtitle: 'Arrastra tarjetas o usa el menú de etapa; cada cambio se guarda con rollback.',
    openingLabel: 'Postulantes de', allOpenings: 'Todas las vacantes', moveTo: 'Mover a etapa', saved: 'Etapa actualizada.',
    saving: 'Guardando cambio…', rollback: 'No se pudo mover, se revirtió.',
    emptyLane: 'Suelta una postulación aquí', keyboardHint: 'También puedes mover esta postulación con teclado.',
    stages: {
      sourced: 'Sourced', screening: 'Screening', qualified: 'Evaluación', shortlisted: 'Evaluación',
      client_review: 'Evaluación', interview: 'Entrevista', decision_pending: 'Decisión', selected: 'Cerrado',
      backup: 'Cerrado', rejected: 'Cerrado', withdrawn: 'Cerrado', handoff_ready: 'Cerrado', closed: 'Cerrado'
    }
  },
  application: {
    back: 'Volver', overview: 'Resumen', assessment: 'Evaluación', documents: 'Documentos',
    decision: 'Decisión', decideAction: 'Decidir', activity: 'Actividad', candidate: 'Candidato', contact: 'Contacto protegido', opening: 'Vacante',
    score: 'Score', match: 'Match', nextStep: 'Próximo paso', source: 'Fuente', assessmentTitle: 'Assessment y scorecard',
    assessmentPending: 'Sin evaluación asignada', assignAssessment: 'Asignar test',
    assignmentLink: 'Enlace único de rendición', copyLink: 'Copiar enlace', documentsTitle: 'Documentos del candidato',
    reviewAssessment: 'Revisar evaluación', reviewPending: 'Pendiente de corrección', aiSuggestion: 'Sugerencia IA',
    aiSuggestionNote: 'La IA propone un puntaje; tú lo confirmas o editas antes de que cuente.', scoreLabel: 'Puntaje', overallScore: 'Score global',
    confirmScore: 'Confirmar puntaje', scoreConfirmed: 'Puntaje confirmado.', finalizeScorecard: 'Finalizar scorecard',
    scorecardFinalized: 'Scorecard finalizado.',
    documentsUnavailable: 'Resolver documental pendiente', documentsBody: 'Documentos resueltos por el servicio de captura (TASK-1362). La identidad es sensible y exige capability + motivo.', revealConfirm: 'Revelar y registrar',
    decisionTitle: 'Decisión estructurada', decisionIntro: 'Tú decides. El scorecard es solo input — nunca un gate. La decisión es defendible y contestable.',
    decisionType: 'Acción', decisionAdvance: 'Avanzar', decisionReject: 'Rechazar', decisionHold: 'En espera',
    destination: 'Destino', startDate: 'Fecha tentativa', legalEntity: 'Entidad legal esperada',
    context: 'Contexto', reason: 'Razón de la decisión', evidence: 'Evidencia (una por línea)',
    advisoryOverride: 'Esta decisión se aparta de la recomendación automática', confirmTitle: 'Confirmar decisión',
    confirmBody: 'Esta acción actualizará la etapa y agregará una entrada inmutable al historial.', decided: 'Decisión registrada.', supersede: 'Re-decidir (supersede con auditoría)',
    history: 'Historial de decisiones', activityTitle: 'Actividad de la postulación'
  },
  publication: {
    title: 'Publicación', subtitle: 'Gobernanza de qué se publica — el público solo ve el payload permitido.',
    publicPreview: 'Se publicará (público)', internalOnly: 'No se publica (solo interno)', allowlist: 'Diff interno ↔ público', publish: 'Publicar vacante',
    pause: 'Pausar', resume: 'Reanudar', reopen: 'Reabrir', close: 'Cerrar vacante', edit: 'Editar contenido', publishTitle: '¿Publicar esta vacante?',
    publishBody: 'La oferta quedará visible en Careers con solo los campos permitidos.', pauseTitle: '¿Pausar publicación?',
    pauseBody: 'La oferta dejará de estar visible; su contenido se conserva.', closeTitle: '¿Cerrar vacante?',
    closeBody: 'La vacante se cerrará y no admitirá nuevas postulaciones.', resumeBody: 'La publicación volverá a recibir postulaciones.', reopenBody: 'La vacante volverá a estar publicada.', updated: 'Estado de publicación actualizado.',
    noOpening: 'Selecciona una vacante para revisar su publicación.'
  }
}
