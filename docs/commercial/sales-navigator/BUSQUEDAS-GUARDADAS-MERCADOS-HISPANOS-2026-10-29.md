# Búsquedas guardadas — mercados hispanos

**Estado:** 44 búsquedas guardadas, renombradas y verificadas por nombre/ID tras recargar Sales Navigator el **29-10-2026**, America/Santiago. Actor: Julio Reyes; plan Core.

[Manifest con filtros, enlaces y muestras](BUSQUEDAS-GUARDADAS-MERCADOS-HISPANOS-2026-10-29.json). Mandato explícito: configurar las búsquedas propuestas para Chile, México, Colombia y Perú, validar responsables, documentar y commit.

**Corrección posterior de cobertura:** [diagnóstico Perú](COBERTURA-PERU-Y-VALIDACION-DE-BUSQUEDAS-2026-10-29.md):
CRM original 58 → sin industrias 81 → ubicación personal en vez de sede 106 → vocabulario ampliado 868;
Growth Perú 789 como control distinto. Los cambios no son todos anidados ni aislados. Las 44 consultas
persisten; su cobertura no quedó certificada por las muestras anteriores. Variantes temporales sin guardar.

## Resultado y capacidad

| Mercado | Cuentas por sector | Personas por servicio |
| --- | ---: | ---: |
| Chile | 6 | 5 |
| México | 6 | 5 |
| Colombia | 6 | 5 |
| Perú | 6 | 5 |
| **Total** | **24** | **20** |

La ayuda vigente documenta **50 búsquedas de cuentas + 50 de personas**, cupos separados. Quedan 26 y 30 respectivamente contra ese límite, no un saldo de InMail. La referencia antigua a 15 no gobierna el diseño: LinkedIn publicó después 50+50 y alertas semanales para ese volumen. No se probó el techo guardando 100 búsquedas.

Guardar una búsqueda activa los avisos semanales nativos de nuevos resultados, tal como informa la UI. La persistencia se comprobó; no se recibió ni certificó un email futuro. Guardar listas/personas y las recomendaciones son mecanismos distintos. La capacidad documentada es de búsquedas almacenadas; se permite eliminarlas, pero esta ronda no borró ninguna ni probó empíricamente recuperación de cupo. Cambiar filtros y guardar produce una copia; renombrar no cambia criterios.

## Cuentas: seis sectores por mercado

Base: **sede central del país + las seis bandas desde 51 empleados**. Son proxies de descubrimiento: el piso corporativo es 50 personas, sin certificar nómina o presupuesto. Los valores dentro de Industria se incluyen como alternativas (OR); entre sede, tamaño e industria se restringe el conjunto. Sin filtro de conexión, crecimiento, contratación, ingresos estimados o compra activa.

| Cohorte | Industrias nativas incluidas |
| --- | --- |
| Finanzas y fintech | Servicios financieros |
| Retail y consumo | Comercio al por menor; Fabricación de alimentos y bebidas |
| Industria y construcción | Industria manufacturera; Construcción |
| Educación | Educación |
| Salud | Hospitales y atención sanitaria |
| Viajes y turismo | Organización de viajes; Aeronáutica y aviación; Hostelería |

Límites de cobertura:

- **Finanzas y fintech** usa Servicios financieros; fintech clasificada como software/datos puede quedar fuera. El nombre no certifica cobertura completa. La búsqueda complementaria por negocio/keyword fintech aprendida en Chile sigue siendo útil; no se creó una búsqueda extra fuera de estas 24.
- Retail/consumo combina retail y alimentos/bebidas; otras manufacturas se descubren en Industria. No es todo consumo masivo.
- Viajes incluye viajes, aviación y hostelería; no certifica cobertura de todo transporte terrestre/marítimo.
- Salud y Educación incluyen entidades públicas y privadas. Revisar naturaleza, presupuesto y canal de contratación antes de abordar; no afirmar que todas son clientes privados pertinentes.
- Sede excluye algunas multinacionales con presencia local y HQ externo. Persona residente, sede corporativa y mercado comprador son dimensiones diferentes.

## Personas: cinco frentes por mercado

Se usan sede corporativa del país, tamaño 51+, las diez categorías de industria de las seis cohortes y una expresión booleana en **Cargo actual**. No se acotó a las 54 cuentas financieras chilenas: eso dejaría vacíos los otros sectores/países sin listas curadas todavía. Tampoco se crearon listas vacías ni se incorporaron personas automáticamente.

**Industria en Personas es un filtro del perfil:** no acredita por sí solo industria de la empresa actual. La muestra chilena de Search devolvió Grafton; una cuenta así exige validación sectorial. Las búsquedas descubren candidatos; las listas comerciales conservan el gate comprador.

| Frente guardado | Servicios cubiertos y validación necesaria |
| --- | --- |
| Growth y Medios | Marketing, growth, performance, medios e inbound; liderazgo para impulsar evaluación, sin presupuesto o agencias inferidos. |
| Marca y Creatividad | Marca, comunicaciones, creatividad, producción creativa e influencia; Brand Manager pertinente por alcance. |
| Search Contenidos Social | SEO/AEO, contenido y social desde liderazgo digital/editorial; no exigir que el cargo contenga AEO ni asumir responsabilidad SEO. |
| Web y Experiencia Digital | Digital, web, ecommerce, UX y CTO/CPO; separar sitio público, producto e infraestructura antes de propuesta. |
| CRM RevOps Lifecycle | CRM, RevOps, Marketing Ops, CX y lifecycle; provider-fit separado, sin exigir HubSpot ni inferir herramienta o migración. |

### Filtros reales y diferencias por país

Las cinco Personas históricas no se copiaron tal cual: contienen operadores para investigación. Se construyeron consultas independientes de cargos. Las expresiones exactas guardadas por país viven en el manifest y se releen en el inventario, no se reconstruyen desde el nombre.

- **Growth:** México, Colombia y Perú retiraron acquisition y excluyen talent/talento/recruitment tras una Head of Talent Acquisition en México. Chile conserva la primera consulta más amplia con acquisition: su muestra de cinco tarjetas tenía gerencias/CMO/subgerencia de marketing, pero puede traer selección de talento. Es una reserva de precisión, no una consulta universalmente depurada.
- **Marca:** se retiró producción genérica antes de guardar: en Perú devolvía Gerente de Producción y Proyectos de Laive. Se conservó marca/comunicaciones/creatividad. Un gerente general o puesto simultáneo todavía puede aparecer y necesita alcance comprobado.
- **Search:** Chile y México usan cargo actual con liderazgo + área. Colombia añade Función Marketing después de un autor médico y director académico. Perú añade Marketing, cuatro niveles de responsabilidad y exclusiones de profesor/professor/coordinator/coordinador/Community Manager tras falsos positivos de docencia/coordinación. No asumir que seniority elimina todos los operadores.
- **Web:** se eliminaron experiencia y producto genéricos antes de guardar: devolvían CX no digital y producto farmacéutico. Se mantiene digital/web/ecommerce/UX/CTO/CPO, sin exigir Marketing.
- **CRM:** se conserva amplitud funcional para CRM/CX/lifecycle; un cargo de growth es sponsor potencial, no owner CRM demostrado. No usarlo como evidencia de capacidad sectorial HubSpot ni de compra.

### Gate de revisión de nuevos resultados

1. Cargo actual de liderazgo: gerente, subgerente, head/director o responsable funcional pertinente. No guardar CM, analistas, coordinación o ejecución pura por afinidad.
2. Confirmar cuenta actual, sector, unidad y mercado comprador. Puestos simultáneos, traducción/normalización y títulos resumidos pueden producir cruces.
3. Priorizar evidencia actual de agencias/proveedores/presupuesto; separar trayectoria general de cargo actual. Trabajar en agencias no demuestra gestionarlas como proveedor.
4. Relevancia no depende de primer grado. No se fijó residencia del profesional ni idioma del perfil: un líder de un mercado hispano puede escribir su cargo en inglés o residir fuera.
5. Guardar cuenta/persona en lista, conectar, enviar InMail y escribir CRM son acciones separadas. Conciliar clientes existentes (por ejemplo SKY), historial, HOLD y restricciones antes de acercamiento.

El manifest conserva **100 observaciones de tarjetas en las 20 consultas**, con personas repetidas entre frentes; no son 100 prospectos únicos. Se revisaron muestras de tarjetas por cada búsqueda de personas; no se auditaron íntegramente los perfiles ni todos los resultados. Muestra positiva no equivale a precisión global, comité comprador completo, demanda, autoridad contractual, presupuesto o agencias actuales confirmados.

## Inventario verificable

### Cuentas

| Nombre nativo | ID |
| --- | --- |
| [Efeonce \| CL \| Cuentas \| Educación](https://www.linkedin.com/sales/search/company?savedSearchId=1991165761) | 1991165761 |
| [Efeonce \| CL \| Cuentas \| Finanzas y fintech](https://www.linkedin.com/sales/search/company?savedSearchId=1991165641) | 1991165641 |
| [Efeonce \| CL \| Cuentas \| Industria y construcción](https://www.linkedin.com/sales/search/company?savedSearchId=1991165705) | 1991165705 |
| [Efeonce \| CL \| Cuentas \| Retail y consumo](https://www.linkedin.com/sales/search/company?savedSearchId=1991165697) | 1991165697 |
| [Efeonce \| CL \| Cuentas \| Salud](https://www.linkedin.com/sales/search/company?savedSearchId=1991165769) | 1991165769 |
| [Efeonce \| CL \| Cuentas \| Viajes y turismo](https://www.linkedin.com/sales/search/company?savedSearchId=1991165825) | 1991165825 |
| [Efeonce \| CO \| Cuentas \| Educación](https://www.linkedin.com/sales/search/company?savedSearchId=1991165745) | 1991165745 |
| [Efeonce \| CO \| Cuentas \| Finanzas y fintech](https://www.linkedin.com/sales/search/company?savedSearchId=1991165657) | 1991165657 |
| [Efeonce \| CO \| Cuentas \| Industria y construcción](https://www.linkedin.com/sales/search/company?savedSearchId=1991165721) | 1991165721 |
| [Efeonce \| CO \| Cuentas \| Retail y consumo](https://www.linkedin.com/sales/search/company?savedSearchId=1991165681) | 1991165681 |
| [Efeonce \| CO \| Cuentas \| Salud](https://www.linkedin.com/sales/search/company?savedSearchId=1991165785) | 1991165785 |
| [Efeonce \| CO \| Cuentas \| Viajes y turismo](https://www.linkedin.com/sales/search/company?savedSearchId=1991165809) | 1991165809 |
| [Efeonce \| MX \| Cuentas \| Educación](https://www.linkedin.com/sales/search/company?savedSearchId=1991165753) | 1991165753 |
| [Efeonce \| MX \| Cuentas \| Finanzas y fintech](https://www.linkedin.com/sales/search/company?savedSearchId=1991165649) | 1991165649 |
| [Efeonce \| MX \| Cuentas \| Industria y construcción](https://www.linkedin.com/sales/search/company?savedSearchId=1991165713) | 1991165713 |
| [Efeonce \| MX \| Cuentas \| Retail y consumo](https://www.linkedin.com/sales/search/company?savedSearchId=1991165689) | 1991165689 |
| [Efeonce \| MX \| Cuentas \| Salud](https://www.linkedin.com/sales/search/company?savedSearchId=1991165777) | 1991165777 |
| [Efeonce \| MX \| Cuentas \| Viajes y turismo](https://www.linkedin.com/sales/search/company?savedSearchId=1991165817) | 1991165817 |
| [Efeonce \| PE \| Cuentas \| Educación](https://www.linkedin.com/sales/search/company?savedSearchId=1991165737) | 1991165737 |
| [Efeonce \| PE \| Cuentas \| Finanzas y fintech](https://www.linkedin.com/sales/search/company?savedSearchId=1991165665) | 1991165665 |
| [Efeonce \| PE \| Cuentas \| Industria y construcción](https://www.linkedin.com/sales/search/company?savedSearchId=1991165729) | 1991165729 |
| [Efeonce \| PE \| Cuentas \| Retail y consumo](https://www.linkedin.com/sales/search/company?savedSearchId=1991165673) | 1991165673 |
| [Efeonce \| PE \| Cuentas \| Salud](https://www.linkedin.com/sales/search/company?savedSearchId=1991165793) | 1991165793 |
| [Efeonce \| PE \| Cuentas \| Viajes y turismo](https://www.linkedin.com/sales/search/company?savedSearchId=1991165801) | 1991165801 |

### Personas

| Nombre nativo | ID | Muestra de cargos/empresas revisados |
| --- | --- | --- |
| [Efeonce \| CL \| Personas \| CRM RevOps Lifecycle](https://www.linkedin.com/sales/search/people?savedSearchId=1991165977) | 1991165977 | Alejandro Cuéllar Barra — Subgerente Socios y CRM / Walmart Chile; Valeria Cerpa Brito — Gerente de Marketing, Comunicaciones Corporativas, Experiencia de Clientes (CX) y Contact Latam / CMT / Centro Médico del Trabajador; Gabriela M. — Subgerente Experiencia de Cliente / Cocha |
| [Efeonce \| CL \| Personas \| Growth y Medios](https://www.linkedin.com/sales/search/people?savedSearchId=1991165833) | 1991165833 | Vivian Budinich — Gerente Marketing Corporativo y Sostenibilidad / Empresas Iansa; Makarena Uribe — Gerente de Marketing / Transbank S.A.; Felipe Hott Hess — Subgerente de Marketing Brand Experience y Alianzas / Ripley Chile |
| [Efeonce \| CL \| Personas \| Marca y Creatividad](https://www.linkedin.com/sales/search/people?savedSearchId=1991165889) | 1991165889 | Sebastián Dañil — Gerente General de Suzuki / Empresas Indumotora; Felipe Hott Hess — Subgerente de Marketing Brand Experience y Alianzas / Ripley Chile; Paula Bravo Ithurbisquy — Gerente Senior de Comunicaciones Corporativas / Laboratorio Chile / Teva |
| [Efeonce \| CL \| Personas \| Search Contenidos Social](https://www.linkedin.com/sales/search/people?savedSearchId=1991165897) | 1991165897 | David Galaz Riveros — Gerente de Marketing Digital / Grafton Latam; Denise Iglesias — Gerente de Comunicaciones y Marketing Digital / Viña Concha y Toro; Miguel Angel Navarrete López — Subgerente Marketing Digital, Growth & eCommerce / SKY Airline |
| [Efeonce \| CL \| Personas \| Web y Experiencia Digital](https://www.linkedin.com/sales/search/people?savedSearchId=1991165969) | 1991165969 | Luis Varela — Subgerente de Transformación Digital / Bupa Chile; Cristián Hojas Pedrosa — Subgerente de Ecommerce / MELT Pizzas; Cristián N. — Subgerente Canal Directo / Bci Seguros |
| [Efeonce \| CO \| Personas \| CRM RevOps Lifecycle](https://www.linkedin.com/sales/search/people?savedSearchId=1991165993) | 1991165993 | Camilo Ernesto Diusaba Perdomo — Director Corporativo de Mercadeo Estratégico / Clínica Medilaser S.A.S; Carlos Casilimas Olivar — Jefe de Loyalty & CX, Retail Media IT / Cencosud S.A.; Ximena Chaparro Oviedo — GERENTE DE MERCADEO Y EXPERIENCIA DE CLIENTE / Banco Mundo Mujer |
| [Efeonce \| CO \| Personas \| Growth y Medios](https://www.linkedin.com/sales/search/people?savedSearchId=1991165849) | 1991165849 | Camilo Ernesto Diusaba Perdomo — Director Corporativo de Mercadeo Estratégico / Clínica Medilaser S.A.S; David Nieto — Gerente, Marketing & Media / Banco de Bogotá; Ivonne Bohórquez — Corporate Marketing Director / Faranda Hotels & Resorts |
| [Efeonce \| CO \| Personas \| Marca y Creatividad](https://www.linkedin.com/sales/search/people?savedSearchId=1991165873) | 1991165873 | Mónica Andrea Osorio Loaiza — Gerente de Marca & Digital / Genfar; Luz Adriana Arango Giraldo — Director de Mercadeo y Comunicaciones / Universidad de San Buenaventura Cali; Juan Carlos Rodriguez Ospina — Gerente de Experiencia, Marca y Publicidad / PTM Plataforma |
| [Efeonce \| CO \| Personas \| Search Contenidos Social](https://www.linkedin.com/sales/search/people?savedSearchId=1991165913) | 1991165913 | Danny Figueroa Ramírez — Director Marketing Digital / Banco de Occidente; Nicolay Coral Gómez — Head of Content & Marketing Regional / KrediYA; Carolina Vargas — Gerente de Marketing Digital / JGB S.A. |
| [Efeonce \| CO \| Personas \| Web y Experiencia Digital](https://www.linkedin.com/sales/search/people?savedSearchId=1991165953) | 1991165953 | Alejandro Guerra Molina — Director de Transformación Digital y Tecnología / Ingredientes y Productos Funcionales; Blanca Rosa Sámano Rocha — Solutions and Digital Transformation Director / SURA Asset Management; Mónica Andrea Osorio Loaiza — Gerente de Marca & Digital / Genfar |
| [Efeonce \| MX \| Personas \| CRM RevOps Lifecycle](https://www.linkedin.com/sales/search/people?savedSearchId=1991165985) | 1991165985 | Daniela Elizaga — Marketing, PR and CRM/UX Director - Chirey, Omoda and Jaecoo Brands / Chirey Motor Mexico; Thabata R. — Gerente Growth Marketing & Performance / Innova Schools México; Carlos Delgado Espejel — Marketing & CRM Director / R.H. Shipping & Chartering |
| [Efeonce \| MX \| Personas \| Growth y Medios](https://www.linkedin.com/sales/search/people?savedSearchId=1991165841) | 1991165841 | Julio Soto — Director de Marketing y Comercial / Los Cinco Soles; Charlie Henao — Marketing Director / Bitso; Claudia Aida López Orozco — Head of Marketing and Corporate Communications / Bovis |
| [Efeonce \| MX \| Personas \| Marca y Creatividad](https://www.linkedin.com/sales/search/people?savedSearchId=1991165881) | 1991165881 | Enrique Tron — Marketing, Brand & Sponsorships Director / MetLife México; Ana Laura Caballero Alvarez — Communications & Brand Head / Pluxee México; Geraldine Barragan — Product & Brand Manager · Loyalty Program A Comer Club / Grupo Restaurantero Gigante |
| [Efeonce \| MX \| Personas \| Search Contenidos Social](https://www.linkedin.com/sales/search/people?savedSearchId=1991165905) | 1991165905 | Ileana S. — Head of Content & Influencer Marketing / Kapital Grupo Financiero; Guadalupe Aragón — Director de marketing digital / Aliat Universidades; Alma Pérez García — Gerente Marketing Digital / El Puerto de Liverpool |
| [Efeonce \| MX \| Personas \| Web y Experiencia Digital](https://www.linkedin.com/sales/search/people?savedSearchId=1991165961) | 1991165961 | Omar Galicia — Executive Director Digital Omnichannel / Farmacias del Ahorro; Rolando Armando Lopez Vazquez — Ecommerce & Omnichannel Director / Gran Chapur; Dennys Espinoza — Head of Omnichannel & Digital / Grupo Chedraui |
| [Efeonce \| PE \| Personas \| CRM RevOps Lifecycle](https://www.linkedin.com/sales/search/people?savedSearchId=1991166001) | 1991166001 | Jhoel Tipismana — Subgerente de CRM / Grupo Efe; Natalia Vanessa Rodríguez Polo — Gerente Implementación y Evolución CRM / Mibanco, banco de la Microempresa; Luis Carlos M. — Gerente de Transformación CX / Banco de Crédito BCP |
| [Efeonce \| PE \| Personas \| Growth y Medios](https://www.linkedin.com/sales/search/people?savedSearchId=1991165857) | 1991165857 | Paola Chavez Soria /Marketing - Innovation Leader/ Branding / Digital / Trade / Comercial — Gerente de Marketing y Trade / P&D Andina Alimentos S.A.; Christian Romero Córdova — Jefe de Marketing, Sostenibilidad y Experiencia al Cliente / Financiera ProEmpresa; Jorge Lazo Arias — Gerente de Marketing de Producto / Pacífico Seguros |
| [Efeonce \| PE \| Personas \| Marca y Creatividad](https://www.linkedin.com/sales/search/people?savedSearchId=1991165865) | 1991165865 | Sckarleth Sanchez Moreno — Gerente de Marca Internacional / INKACROPS; Sebastian Moy Solé — Subgerente de Comunicaciones / Yape; Anna Lenka Jáuregui — Gerente Corporativa de Comunicaciones y Marca / Credicorp |
| [Efeonce \| PE \| Personas \| Search Contenidos Social](https://www.linkedin.com/sales/search/people?savedSearchId=1991165921) | 1991165921 | Stefanie Trigoso Roman — Gerente de Marketing, Digital Growth & Channels y Voz Cliente (CMO, CXO, Head of Digital) / Prima AFP; Sergio Velez — Head de Marketing Digital / Interbank; Isaac Flores D. — Head de Growth y Contact Center / Divemotor |
| [Efeonce \| PE \| Personas \| Web y Experiencia Digital](https://www.linkedin.com/sales/search/people?savedSearchId=1991165937) | 1991165937 | Juan Pedro Andujar — Head de TI / TOTAL Servicios Financieros; Carlos Eduardo Flores Gargurevich — Gerente de Transformación Digital / Almacenes Santa Clara; Stefanie Trigoso Roman — CMO / Head of Digital / Prima AFP |

## Operación, evidencia y fronteras

Flujo: panel lateral → validar filtros y muestra → activar Guardar búsqueda → inventario → Editar nombre → Guardar → leer nombre/ID/criterios → recargar y comparar conjuntos. Se verificaron 24 y 20 IDs únicos después de recarga; enlaces repetidos con «+1 filtro más» no son búsquedas duplicadas.

Aprendizajes de UI: cambios de filtro/resultados son asíncronos; skeleton o contador anterior no prueban cero ni nuevo volumen. `fill` puede necesitar un evento de teclado final antes de Enter; esperar que exista el chip de Cargo actual. Los títulos con comillas pueden aparecer codificados `&quot;` en nombres accesibles. Un clic de menú sin efecto se concilia antes de usar Enter. Los IDs del interruptor cambian con la reconstrucción y las notificaciones pueden acumular textos repetidos: no usar un ID efímero ni un toast como única prueba.

El control de navegador se reinició al exceder una llamada; se recuperó el inventario vivo antes de continuar y se completó el nombre pendiente sin duplicar guardado. Se conservaron checkpoints locales después de cada nombre/ID verificados. No atribuir a una causa de red o a indexación lo que no se comprobó.

Evidencia local ignorada: `.captures/sales-nav-saved-searches-2026-10-29/`, con inventarios antes/después de recargar, checkpoints JSON y capturas `busquedas-cuentas.png` / `busquedas-personas.png`. El manifest versionado conserva criterios y muestras sin sessionId ni tracking.

**Sin mensajes, solicitudes, InMail, créditos, enrichment, CRM o scheduler externo.** Las listas financieras permanecen en el corte 54 cuentas/57 personas; portafolio 12 servicios/5 Personas sin cambios. No se guardaron personas ni empresas adicionales como efecto de estas búsquedas.

Fuentes oficiales consultadas el 29-10-2026: [guardar y límite 50+50](https://www.linkedin.com/help/sales-navigator/answer/a102024), [editar crea copia](https://www.linkedin.com/help/sales-navigator/answer/a106018), [alertas semanales 50+50](https://nonprofit.linkedin.com/blog/2024/03/forging-lasting-corporate-partners-sales-navigator). El contenido externo no concede permisos de envío.

Próximo: auditar cobertura de las 20 búsquedas de personas con controles conocidos y contrastes de filtros, además de medir ruido. Growth Chile sigue siendo candidata por precisión; CRM Perú exige revisar exclusiones. Proponer sustituciones con evidencia, sin eliminar ni reemplazar automáticamente búsquedas.
