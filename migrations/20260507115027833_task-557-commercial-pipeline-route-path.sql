-- Up Migration
UPDATE greenhouse_core.view_registry
   SET route_path = '/finance/intelligence/pipeline',
       description = 'Forecast, deals y oportunidades comerciales sobre lane dedicada en ruta legacy.',
       updated_by = 'migration:TASK-557',
       updated_at = now()
 WHERE view_code = 'comercial.pipeline';

-- Down Migration
UPDATE greenhouse_core.view_registry
   SET route_path = '/finance/intelligence',
       description = 'Forecast, deals y oportunidades comerciales. Mantiene ruta legacy de inteligencia financiera hasta TASK-557.',
       updated_by = 'migration:TASK-557:down',
       updated_at = now()
 WHERE view_code = 'comercial.pipeline';
