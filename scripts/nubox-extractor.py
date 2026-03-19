#!/usr/bin/env python3
"""
NUBOX DATA EXTRACTOR — Efeonce Group
======================================
Extrae datos financieros de Nubox usando los endpoints GET disponibles:
- XMLs de venta por fecha (trae todos los documentos del día)
- XMLs de compra por fecha
- Estado de documentos individuales
- PDFs de documentos

Esto alimentará BigQuery → Greenhouse Portal.

Instrucciones:
1. pip install requests
2. Completar las credenciales abajo
3. python nubox_extractor.py
4. Copiar el output y pegarlo en el chat de Claude

IMPORTANTE: Necesitas las credenciales de la API antigua (Usuario API + Contraseña)
que se obtienen desde Contabilidad > Configuración > Empresas > Usuario API
"""

import requests
import json
import base64
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import sys
import os

# ============================================================
# CREDENCIALES — COMPLETAR CON TUS DATOS
# ============================================================

# Credenciales API antigua (Factura Electrónica)
# Se obtienen desde: Contabilidad Cirrus > Configuración > Empresas > Usuario API
API_USER = os.environ.get("NUBOX_API_USER", "")
API_PASSWORD = os.environ.get("NUBOX_API_PASSWORD", "")

# RUT de Efeonce (sin puntos, con guión)
RUT_EMPRESA = os.environ.get("NUBOX_RUT_EMPRESA", "")

# Credenciales Nueva API (las que ya generaste)
# Leer desde variables de entorno o completar aquí para uso local
BEARER_TOKEN = os.environ.get("NUBOX_BEARER_TOKEN", "")
X_API_KEY = os.environ.get("NUBOX_X_API_KEY", "")

# ============================================================
# CONFIGURACIÓN
# ============================================================

BASE_URL = "https://api.nubox.com"

# Rango de fechas para extracción (últimos N días)
DIAS_ATRAS = 30

# Tipos de documento a consultar
TIPOS_DOC_VENTA = [
    ("FAC-EL", "Factura Electrónica"),
    ("FAC-EE", "Factura Exenta Electrónica"),
    ("N%2FD-EL", "Nota Débito Electrónica"),
    ("N%2FC-EL", "Nota Crédito Electrónica"),
    ("BOL-EL", "Boleta Electrónica"),
    ("BOL-EE", "Boleta Exenta Electrónica"),
]

SEPARATOR = "=" * 70
SUB_SEP = "-" * 50


def log(msg):
    print(msg)


def log_section(title):
    log(f"\n{SEPARATOR}")
    log(f"  {title}")
    log(SEPARATOR)


def log_subsection(title):
    log(f"\n{SUB_SEP}")
    log(f"  {title}")
    log(SUB_SEP)


def safe_json(response):
    try:
        return response.json()
    except Exception:
        return {"_raw_text": response.text[:2000]}


# ============================================================
# PASO 1: AUTENTICACIÓN (API Antigua)
# ============================================================

def autenticar():
    """Autentica con la API antigua y retorna token + número de serie."""
    log_section("PASO 1: AUTENTICACIÓN")

    if not API_USER or not API_PASSWORD:
        log("\n  ⚠️  Credenciales de API antigua no configuradas.")
        log("  Para obtenerlas:")
        log("    1. Ingresa a Contabilidad Cirrus (sistema azul)")
        log("    2. Ve a Configuración → Empresas")
        log("    3. Selecciona la empresa y haz doble clic")
        log("    4. Pestaña 'Usuario API' → copia usuario y contraseña")
        log("  Luego completa API_USER y API_PASSWORD en este script.")
        return None, None

    credentials = f"{API_USER}:{API_PASSWORD}"
    b64 = base64.b64encode(credentials.encode()).decode()

    headers = {
        "Authorization": f"Basic {b64}",
        "Content-Type": "application/json"
    }

    url = f"{BASE_URL}/nubox.api/autenticar"
    log(f"\n  POST {url}")

    try:
        resp = requests.post(url, headers=headers, timeout=15)
        log(f"  Status: {resp.status_code}")

        body = safe_json(resp)
        log(f"  Response: {json.dumps(body, indent=2, ensure_ascii=False)[:1500]}")

        token = resp.headers.get("Token", "")
        log(f"  Token: {token[:30]}..." if token else "  Token: NO ENCONTRADO")

        if resp.status_code != 200 or not token:
            log("\n  ❌ Autenticación fallida. Verifica credenciales.")
            return None, None

        # Extraer números de serie de los sistemas
        numeros_serie = {}
        if isinstance(body, list):
            for s in body:
                if isinstance(s, dict):
                    nombre = str(s.get("NombreProducto", "") or s.get("Producto", "") or s.get("nombre", "") or "")
                    ns = s.get("NumeroSerie") or s.get("numeroSerie") or s.get("numero_serie")
                    if ns:
                        numeros_serie[nombre] = str(ns)
                        log(f"  Sistema encontrado: {nombre} → Serie: {ns}")

        log(f"\n  ✅ Autenticación exitosa")
        log(f"  Sistemas encontrados: {len(numeros_serie)}")

        return token, numeros_serie

    except Exception as e:
        log(f"  ERROR: {e}")
        return None, None


# ============================================================
# PASO 2: PROBAR NUEVA API (Bearer + X-Api-Key)
# ============================================================

def probar_nueva_api():
    """Prueba la nueva API para ver qué endpoints responden."""
    log_section("PASO 2: NUEVA API — Discovery de endpoints")

    headers = {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "X-Api-Key": X_API_KEY,
        "Content-Type": "application/json"
    }

    # Lista de endpoints posibles para probar
    endpoints_test = [
        # Documentos
        "/fa/v1/documents",
        "/fa/v1/dte",
        "/fa/v1/dte/list",
        "/fa/v1/emision",
        "/fa/v1/emisor",
        # Maestros
        "/fa/v1/clients",
        "/fa/v1/clientes",
        "/fa/v1/customers",
        "/fa/v1/providers",
        "/fa/v1/proveedores",
        "/fa/v1/products",
        "/fa/v1/productos",
        # Otros
        "/fa/v1/health",
        "/fa/v1/ping",
        "/fa/v1/status",
        "/fa/v1/me",
        "/fa/v1/company",
        "/fa/v1/empresa",
        # Sin prefijo fa
        "/v1/documents",
        "/v1/clients",
        "/v1/health",
        "/api/v1/documents",
        "/api/v1/clients",
    ]

    encontrados = []

    for ep in endpoints_test:
        url = f"{BASE_URL}{ep}"
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            status = resp.status_code
            marker = "✅" if status < 400 else ("⚠️" if status < 500 else "❌")

            if status != 404:  # Solo mostrar los que no son 404
                body_preview = resp.text[:200]
                log(f"  {marker} GET {ep} → {status}")
                log(f"      {body_preview}")
                if status < 400:
                    encontrados.append(ep)

        except requests.exceptions.Timeout:
            pass
        except Exception as e:
            log(f"  ❌ GET {ep} → {e}")

    if encontrados:
        log(f"\n  🎯 Endpoints que respondieron OK: {encontrados}")
    else:
        log(f"\n  ℹ️  Ningún endpoint de lectura respondió con éxito.")
        log(f"  La Nueva API parece ser solo para emisión de DTEs.")


# ============================================================
# PASO 3: EXTRAER XMLs DE VENTA POR FECHA
# ============================================================

def extraer_xmls_venta(token, numero_serie):
    """
    Extrae XMLs de documentos de venta por fecha.
    El endpoint GET de XML de venta con idDocumento=0 trae todos los del día.
    URL: /Nubox.API/factura/documento/{rut}/venta/{dia}/{tipoDocumento}/{idDocumento}/{numeroSerie}
    """
    log_section("PASO 3: EXTRACCIÓN DE XMLs DE VENTA")

    if not token or not numero_serie:
        log("\n  ⚠️  Sin autenticación. Saltando...")
        return

    headers = {
        "Token": token,
        "Content-Type": "application/json"
    }

    rut = RUT_EMPRESA.replace(".", "")
    hoy = datetime.now()
    documentos_encontrados = 0

    for tipo_code, tipo_nombre in TIPOS_DOC_VENTA:
        log_subsection(f"Tipo: {tipo_nombre} ({tipo_code})")

        for dias in range(DIAS_ATRAS):
            fecha = hoy - timedelta(days=dias)
            fecha_str = fecha.strftime("%Y-%m-%d")

            # idDocumento=0 → trae todos los documentos del día
            url = f"{BASE_URL}/Nubox.API/factura/documento/{rut}/venta/{fecha_str}/{tipo_code}/0/{numero_serie}"

            try:
                resp = requests.get(url, headers=headers, timeout=15)

                if resp.status_code == 200 and resp.text and resp.text.strip():
                    # Intentar parsear XML
                    content_type = resp.headers.get("Content-Type", "")
                    content_length = len(resp.content)

                    if content_length > 50:  # Tiene contenido real
                        documentos_encontrados += 1
                        log(f"  ✅ {fecha_str} → {content_length} bytes")

                        # Intentar parsear el XML para extraer datos
                        try:
                            root = ET.fromstring(resp.text)
                            # Mostrar estructura del XML para entender el formato
                            log(f"      Root tag: {root.tag}")
                            log(f"      Children: {[child.tag for child in root][:5]}")

                            # Intentar extraer info básica
                            for elem in root.iter():
                                tag_lower = elem.tag.lower()
                                if any(k in tag_lower for k in ['folio', 'monto', 'total', 'rut', 'razon']):
                                    if elem.text and elem.text.strip():
                                        log(f"      {elem.tag}: {elem.text.strip()[:100]}")

                            if documentos_encontrados <= 3:
                                # Mostrar el XML completo de los primeros 3
                                log(f"\n      --- XML COMPLETO (primeros 2000 chars) ---")
                                log(f"      {resp.text[:2000]}")
                                log(f"      --- FIN XML ---\n")

                        except ET.ParseError:
                            # Puede ser JSON en vez de XML
                            log(f"      (No es XML, intentando JSON...)")
                            try:
                                data = resp.json()
                                log(f"      JSON: {json.dumps(data, indent=2, ensure_ascii=False)[:1000]}")
                            except Exception:
                                log(f"      Raw: {resp.text[:500]}")

                elif resp.status_code == 200:
                    pass  # Respuesta vacía = no hay documentos ese día

                elif resp.status_code == 401:
                    log(f"  ❌ Token expirado. Re-autenticando...")
                    return  # Necesita re-autenticar

                elif resp.status_code != 404:
                    log(f"  ⚠️  {fecha_str} → Status {resp.status_code}: {resp.text[:200]}")

            except Exception as e:
                log(f"  ERROR {fecha_str}: {e}")

        if documentos_encontrados == 0:
            log(f"  (Sin documentos en los últimos {DIAS_ATRAS} días)")

    log(f"\n  📊 Total documentos encontrados: {documentos_encontrados}")


# ============================================================
# PASO 4: CONSULTAR ESTADO DE DOCUMENTOS
# ============================================================

def consultar_estados(token, numero_serie):
    """
    Consulta estado de documentos de venta específicos.
    URL: /nubox.api/factura/documento/{rut}/estadoventa/{numeroFolio}/{tipoDocumento}/{numeroSerie}
    """
    log_section("PASO 4: CONSULTA DE ESTADOS (folios 1-10)")

    if not token or not numero_serie:
        log("\n  ⚠️  Sin autenticación. Saltando...")
        return

    headers = {
        "Token": token,
        "Content-Type": "application/json"
    }

    rut = RUT_EMPRESA.replace(".", "")

    # Probar los primeros 10 folios de facturas electrónicas
    for folio in range(1, 11):
        url = f"{BASE_URL}/nubox.api/factura/documento/{rut}/estadoventa/{folio}/FAC-EL/{numero_serie}"

        try:
            resp = requests.get(url, headers=headers, timeout=10)

            if resp.status_code == 200 and resp.text.strip():
                body = safe_json(resp)
                log(f"  Folio {folio}: {json.dumps(body, ensure_ascii=False)[:300]}")
            elif resp.status_code != 404:
                log(f"  Folio {folio}: Status {resp.status_code}")

        except Exception as e:
            log(f"  Folio {folio}: ERROR {e}")


# ============================================================
# PASO 5: PROBAR ENDPOINTS NO DOCUMENTADOS
# ============================================================

def probar_endpoints_ocultos(token, numero_serie):
    """
    Prueba endpoints GET que podrían existir pero no están documentados.
    A veces las APIs exponen más de lo que documentan.
    """
    log_section("PASO 5: DISCOVERY — Endpoints no documentados")

    if not token or not numero_serie:
        log("\n  ⚠️  Sin autenticación. Saltando...")
        return

    headers = {
        "Token": token,
        "Content-Type": "application/json"
    }

    rut = RUT_EMPRESA.replace(".", "")

    # Endpoints que podrían existir basados en patrones de la API
    endpoints_prueba = [
        # Posibles GET de maestros
        f"/Nubox.API/factura/{rut}/{numero_serie}/clientes",
        f"/nubox.api/factura/{rut}/{numero_serie}/clientes",
        f"/Nubox.API/factura/{rut}/{numero_serie}/proveedores",
        f"/nubox.api/factura/{rut}/{numero_serie}/proveedores",
        f"/Nubox.API/factura/{rut}/{numero_serie}/productos",
        f"/nubox.api/factura/{rut}/{numero_serie}/productos",
        f"/Nubox.API/factura/{rut}/{numero_serie}/sucursales",
        f"/nubox.api/factura/{rut}/{numero_serie}/sucursales",
        # Posibles listados de documentos
        f"/nubox.api/factura/documento/{rut}/ventas/{numero_serie}",
        f"/nubox.api/factura/documento/{rut}/compras/{numero_serie}",
        f"/nubox.api/factura/{rut}/{numero_serie}/documentos",
        f"/nubox.api/factura/{rut}/{numero_serie}/ventas",
        f"/nubox.api/factura/{rut}/{numero_serie}/compras",
        # Posibles endpoints de contabilidad
        f"/nubox.api/contabilidad/{rut}/{numero_serie}/ventas",
        f"/nubox.api/contabilidad/{rut}/{numero_serie}/compras",
        f"/nubox.api/contabilidad/{rut}/{numero_serie}/comprobantes",
        f"/nubox.api/contabilidad/{rut}/{numero_serie}/recaudaciones",
        f"/nubox.api/contabilidad/{rut}/{numero_serie}/pagos",
        f"/nubox.api/contabilidad/{rut}/{numero_serie}/cuentas",
        f"/nubox.api/contabilidad/{rut}/{numero_serie}/balances",
        # Catálogos
        f"/nubox.api/factura/{rut}/{numero_serie}/comunas",
        f"/nubox.api/comunas",
    ]

    encontrados = []

    for ep in endpoints_prueba:
        url = f"{BASE_URL}{ep}"
        try:
            resp = requests.get(url, headers=headers, timeout=10)

            if resp.status_code == 200 and resp.text.strip() and len(resp.text) > 10:
                log(f"  ✅ GET {ep} → {resp.status_code} ({len(resp.text)} bytes)")
                body = safe_json(resp)
                if isinstance(body, list):
                    log(f"      Array con {len(body)} elementos")
                    if body:
                        log(f"      Primer elemento: {json.dumps(body[0], indent=2, ensure_ascii=False)[:500]}")
                elif isinstance(body, dict):
                    log(f"      Keys: {list(body.keys())[:10]}")
                    log(f"      Preview: {json.dumps(body, indent=2, ensure_ascii=False)[:500]}")
                encontrados.append(ep)

            elif resp.status_code not in [404, 405, 401]:
                log(f"  ⚠️  GET {ep} → {resp.status_code}: {resp.text[:150]}")

        except requests.exceptions.Timeout:
            pass
        except Exception as e:
            log(f"  ❌ GET {ep} → {e}")

    if encontrados:
        log(f"\n  🎯 ENDPOINTS QUE RESPONDIERON:")
        for ep in encontrados:
            log(f"    → {ep}")
    else:
        log(f"\n  ℹ️  Ningún endpoint oculto de lectura encontrado.")


# ============================================================
# RESUMEN
# ============================================================

def print_summary():
    log_section("RESUMEN")
    log(f"""
  Fecha de ejecución: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

  PRÓXIMOS PASOS:
  1. Copia TODO este output
  2. Pégalo en el chat de Claude
  3. Con los resultados diseñamos la integración Nubox → BigQuery → Greenhouse

  Si la autenticación falló, verifica:
  - API_USER y API_PASSWORD (desde Contabilidad > Config > Empresas > Usuario API)
  - RUT_EMPRESA (formato: 76123456-7)
    """)
    log(SEPARATOR)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    log(f"\n{'#' * 70}")
    log(f"  NUBOX DATA EXTRACTOR — Efeonce Group")
    log(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"{'#' * 70}")

    # Paso 1: Autenticación API antigua
    token, numeros_serie = autenticar()

    # Determinar número de serie a usar
    numero_serie = None
    if numeros_serie:
        # Preferir factura electrónica, luego el primero disponible
        for nombre, ns in numeros_serie.items():
            if "factura" in nombre.lower() or "fa" in nombre.lower():
                numero_serie = ns
                break
        if not numero_serie:
            numero_serie = list(numeros_serie.values())[0]
        log(f"\n  Usando número de serie: {numero_serie}")

    # Paso 2: Probar Nueva API
    probar_nueva_api()

    # Paso 3: Extraer XMLs de venta
    extraer_xmls_venta(token, numero_serie)

    # Paso 4: Consultar estados
    consultar_estados(token, numero_serie)

    # Paso 5: Discovery de endpoints ocultos
    probar_endpoints_ocultos(token, numero_serie)

    # Resumen
    print_summary()
