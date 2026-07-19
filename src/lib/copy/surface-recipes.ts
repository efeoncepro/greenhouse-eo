export const surfaceRecipesCopy = {
  lab: {
    eyebrow: 'Greenhouse UI platform',
    title: 'Surface recipes',
    description:
      'Tres composiciones completas para que una interfaz nueva nazca con jerarquía, densidad y movimiento gobernados.',
    tabs: {
      workbench: 'Workbench',
      report: 'Reporte',
      settings: 'Configuración'
    },
    aria: {
      workbenchSignals: 'Señales operativas de activación',
      reportSignals: 'Señales principales del reporte',
      workbenchActions: 'Acciones de la activación seleccionada',
      settingsActions: 'Acciones de configuración de la regla'
    }
  },
  workbench: {
    eyebrow: 'Operación · Growth',
    title: 'Centro de activación de demanda',
    description:
      'Prioriza oportunidades, conserva el contexto y ejecuta la siguiente acción desde un mismo plano operativo.',
    status: 'Motor saludable',
    primary: 'Crear activación',
    secondary: 'Ver actividad',
    inventory: 'Activaciones',
    inventoryDescription: 'Ordenadas por atención requerida',
    signals: [
      {
        id: 'live',
        label: 'En producción',
        value: '12',
        detail: '3 con uplift esta semana',
        tone: 'success' as const,
        iconClassName: 'tabler-bolt'
      },
      {
        id: 'review',
        label: 'Esperan decisión',
        value: '4',
        detail: '2 vencen hoy',
        tone: 'warning' as const,
        iconClassName: 'tabler-clock-hour-4'
      },
      {
        id: 'coverage',
        label: 'Cobertura',
        value: '87%',
        detail: '+9 pts vs. periodo anterior',
        tone: 'primary' as const,
        iconClassName: 'tabler-chart-dots-3'
      }
    ],
    items: [
      {
        id: 'north',
        title: 'Pipeline Norte · Q3',
        subtitle: 'Landing + formulario enterprise',
        status: 'En revisión',
        tone: 'warning' as const,
        description: 'La variante enterprise concentra la intención de mayor valor y mantiene una conversión estable.',
        evidence:
          'La evidencia es suficiente para publicar. El único riesgo abierto es la cobertura móvil del bloque testimonial.',
        confidence: 'Alta',
        recommendation: 'Publicar la variante y monitorear durante 48 horas el breakpoint compacto.',
        context: 'Versión 4 lista para decisión',
        check: 'Todos los checks automáticos pasaron',
        version: 'Versión 4',
        updated: 'hoy, 10:42'
      },
      {
        id: 'retention',
        title: 'Retención clientes activos',
        subtitle: 'CTA contextual en Account 360',
        status: 'Activo',
        tone: 'success' as const,
        description: 'El CTA contextual recupera oportunidades de expansión sin interrumpir la lectura del cliente.',
        evidence: 'La señal mantiene uplift positivo en tres cohortes y no presenta regresiones de navegación.',
        confidence: 'Muy alta',
        recommendation: 'Mantener la variante activa y ampliar la muestra al segmento de servicios profesionales.',
        context: 'Versión 7 operando con estabilidad',
        check: 'Monitoreo y accesibilidad sin hallazgos',
        version: 'Versión 7',
        updated: 'hoy, 09:18'
      },
      {
        id: 'launch',
        title: 'Lanzamiento AEO',
        subtitle: 'Informe + demo comercial',
        status: 'Borrador',
        tone: 'default' as const,
        description:
          'La experiencia articula el informe, la demostración y el siguiente paso comercial en una misma narrativa.',
        evidence: 'La propuesta está completa, pero todavía falta evidencia móvil del handoff desde el informe.',
        confidence: 'Media',
        recommendation: 'Completar el escenario móvil y solicitar una nueva revisión antes de publicar.',
        context: 'Borrador 2 pendiente de evidencia',
        check: 'Falta un checkpoint móvil',
        version: 'Versión 2',
        updated: 'ayer, 17:06'
      }
    ],
    edit: 'Editar experiencia',
    approve: 'Aprobar versión',
    insightTitle: 'Qué necesita tu decisión',
    insightBody:
      'La evidencia es suficiente para publicar. El único riesgo abierto es la cobertura móvil del bloque testimonial.',
    previewTitle: 'Vista de producción',
    previewDescription: 'Contrato renderer v4 · viewport representativo',
    previewStatus: 'Sin drift'
  },
  report: {
    eyebrow: 'Reporte ejecutivo · Semana 28',
    title: 'El crecimiento se sostuvo con mejor calidad de demanda',
    description:
      'La conversión subió sin aumentar la presión comercial: el cambio proviene de mejor intención y menor fricción.',
    status: 'Datos verificados',
    export: 'Exportar',
    signals: [
      {
        id: 'pipeline',
        label: 'Pipeline influido',
        value: 'US$ 284k',
        detail: '+18% vs. objetivo',
        tone: 'success' as const,
        iconClassName: 'tabler-currency-dollar'
      },
      {
        id: 'conversion',
        label: 'Conversión',
        value: '6,8%',
        detail: '+1,2 pts',
        tone: 'primary' as const,
        iconClassName: 'tabler-trending-up'
      },
      {
        id: 'cycle',
        label: 'Ciclo medio',
        value: '19 días',
        detail: '4 días más rápido',
        tone: 'info' as const,
        iconClassName: 'tabler-clock-check'
      }
    ],
    narrativeTitle: 'La señal detrás del resultado',
    narrativeBody:
      'Account 360 y las nuevas muestras de trabajo explican el 71% del uplift. La mejora es consistente en tres segmentos.',
    evidenceTitle: 'Evidencia por origen',
    evidenceDescription: 'Contribución al pipeline calificado'
  },
  settings: {
    eyebrow: 'Configuración · Automatización',
    title: 'Define cómo Greenhouse prioriza una oportunidad',
    description: 'Configura una regla comprensible y reversible. Verás el impacto estimado antes de activarla.',
    status: 'Cambios sin guardar',
    sectionTitle: 'Señal principal',
    sectionDescription: 'Elige qué condición debe liderar la priorización.',
    options: [
      {
        id: 'intent',
        title: 'Intención demostrada',
        subtitle: 'Actividad reciente, profundidad y recurrencia',
        meta: 'Recomendado · cobertura 92%',
        impact: [
          { value: '23', label: 'cambios de prioridad' },
          { value: '0', label: 'automatizaciones en riesgo' },
          { value: '92%', label: 'cobertura de datos' }
        ],
        impactBody: '23 oportunidades cambiarán de prioridad. Ninguna automatización activa quedará fuera de alcance.'
      },
      {
        id: 'fit',
        title: 'Ajuste comercial',
        subtitle: 'Industria, tamaño y capacidad de compra',
        meta: 'Cobertura 78%',
        impact: [
          { value: '17', label: 'cambios de prioridad' },
          { value: '2', label: 'señales por revisar' },
          { value: '78%', label: 'cobertura de datos' }
        ],
        impactBody: '17 oportunidades cambiarán de prioridad. Dos señales incompletas quedarán marcadas para revisión.'
      },
      {
        id: 'urgency',
        title: 'Urgencia declarada',
        subtitle: 'Plazo, evento o bloqueo explícito',
        meta: 'Cobertura 64%',
        impact: [
          { value: '9', label: 'cambios de prioridad' },
          { value: '4', label: 'señales por revisar' },
          { value: '64%', label: 'cobertura de datos' }
        ],
        impactBody: '9 oportunidades cambiarán de prioridad. Cuatro registros necesitarán completar su plazo declarado.'
      }
    ],
    impactTitle: 'Impacto estimado',
    cancel: 'Descartar',
    save: 'Guardar regla'
  }
} as const
