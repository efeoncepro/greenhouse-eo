# Reproducción del fallo Google AI Mode

Ver resultado y límites en GRADER.md y google-ai-mode-diagnostic.json.

```ts
await postDataForSeoTask({
  family: 'serp', consumer: 'aeo',
  endpoint: '/v3/serp/google/ai_mode/live/advanced',
  tasks: [{
    keyword: '¿Cuáles son las mejores opciones de Banca de personas en Perú?',
    location_name: 'Perú', // 40501 Invalid Field: location_name
    // En una llamada independiente, reemplazar sólo por location_code: 2604 → 20000.
    language_code: 'en', device: 'desktop'
  }]
})
```

No ejecutar con SDK o REST paralelo: conservar el cliente canónico y la atribución de consumo AEO. Esta prueba ya se realizó; no hace falta repetirla para explicar la causa. El cambio de localización fue exclusivo de la prueba, no una modificación del run o del perfil.
