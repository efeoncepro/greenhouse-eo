#!/usr/bin/env tsx

import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type GuardPayload = {
  ok: boolean
  postId: number
  postStatus: string | null
  postTitle: string | null
  heroansHash: string | null
  heroansLength: number
  conversFound: boolean
  conversLength: number
  conversHasBridge: boolean
  conversHasGreenhouseForm: boolean
  conversHasApprovedCta: boolean
  conversHasTrustCopy: boolean
}

const expectedHeroansHash = 'e0b951b2456a83578cd9e22005900521'
const phpStartMarker = 'GH_AEO_WP_GUARD_JSON_START'
const phpEndMarker = 'GH_AEO_WP_GUARD_JSON_END'

const php = `<?php
$post_id = 250265;

function gh_aeo_find_element_by_id($elements, $target_id) {
  if (!is_array($elements)) {
    return null;
  }

  foreach ($elements as $element) {
    if (is_array($element) && isset($element['id']) && $element['id'] === $target_id) {
      return $element;
    }

    if (is_array($element) && isset($element['elements'])) {
      $found = gh_aeo_find_element_by_id($element['elements'], $target_id);
      if ($found !== null) {
        return $found;
      }
    }
  }

  return null;
}

function gh_aeo_collect_html($element) {
  if (!is_array($element)) {
    return '';
  }

  $html = '';

  if (isset($element['settings']['html'])) {
    $html .= (string) $element['settings']['html'];
  }

  if (isset($element['elements']) && is_array($element['elements'])) {
    foreach ($element['elements'] as $child) {
      $html .= gh_aeo_collect_html($child);
    }
  }

  return $html;
}

$raw = get_post_meta($post_id, '_elementor_data', true);
$elements = json_decode($raw, true);

if (!is_array($elements)) {
  $elements = array();
}

$post = get_post($post_id);
$heroans = gh_aeo_find_element_by_id($elements, 'heroans');
$convers = gh_aeo_find_element_by_id($elements, 'convers');
$hero_html = is_array($heroans) && isset($heroans['settings']['html']) ? (string) $heroans['settings']['html'] : '';
$convers_html = gh_aeo_collect_html($convers);

$payload = array(
  'ok' => true,
  'postId' => $post_id,
  'postStatus' => $post ? $post->post_status : null,
  'postTitle' => $post ? get_the_title($post_id) : null,
  'heroansHash' => $hero_html !== '' ? md5($hero_html) : null,
  'heroansLength' => strlen($hero_html),
  'conversFound' => is_array($convers),
  'conversLength' => strlen($convers_html),
  'conversHasBridge' => strpos($convers_html, 'gh-aeo-growth-form') !== false && strpos($convers_html, 'gh-aeo-growth-form-button') !== false,
  'conversHasGreenhouseForm' => stripos($convers_html, '<greenhouse-form') !== false,
  'conversHasApprovedCta' => strpos($convers_html, 'Solicitar diagnóstico gratis') !== false,
  'conversHasTrustCopy' => strpos($convers_html, 'Sin costo') !== false && strpos($convers_html, 'Sin compromiso') !== false,
);

echo "${phpStartMarker}\\n";
echo wp_json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
echo "\\n${phpEndMarker}\\n";
`

const extractPayload = (stdout: string): GuardPayload => {
  const start = stdout.indexOf(phpStartMarker)
  const end = stdout.indexOf(phpEndMarker)

  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`WP-CLI output did not include guard JSON markers. Output: ${stdout.slice(-1000)}`)
  }

  const json = stdout.slice(start + phpStartMarker.length, end).trim()

  return JSON.parse(json) as GuardPayload
}

const assertPayload = (payload: GuardPayload) => {
  if (payload.postStatus !== 'publish') {
    throw new Error(`AEO post status is ${payload.postStatus}; expected publish`)
  }

  if (payload.postTitle !== 'AEO') {
    throw new Error(`AEO post title is ${payload.postTitle}; expected AEO`)
  }

  if (payload.heroansHash !== expectedHeroansHash) {
    throw new Error(`heroans hash is ${payload.heroansHash}; expected ${expectedHeroansHash}`)
  }

  if (!payload.conversFound) {
    throw new Error('convers widget was not found in Elementor data')
  }

  if (!payload.conversHasBridge) {
    throw new Error(`convers widget no longer looks like the approved bridge form: ${JSON.stringify(payload)}`)
  }

  if (payload.conversHasGreenhouseForm) {
    throw new Error('convers widget already contains <greenhouse-form>; live cutover should not be present yet')
  }

  if (!payload.conversHasApprovedCta) {
    throw new Error('convers widget is missing approved CTA copy')
  }

  if (!payload.conversHasTrustCopy) {
    throw new Error('convers widget is missing trust copy')
  }
}

const main = () => {
  const dir = mkdtempSync(join(tmpdir(), 'gh-aeo-wp-guard-'))
  const evalFile = join(dir, 'verify-aeo-wordpress-guards.php')

  try {
    writeFileSync(evalFile, php)

    const result = spawnSync(
      'pnpm',
      ['public-website:wpcli', '--', '--eval-file', evalFile, '--wp-user', '12'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      }
    )

    if (result.status !== 0) {
      throw new Error(
        [
          `WP-CLI guard failed with status ${result.status}`,
          result.stdout.trim(),
          result.stderr.trim(),
        ]
          .filter(Boolean)
          .join('\n')
      )
    }

    const payload = extractPayload(result.stdout)

    assertPayload(payload)

    console.log(JSON.stringify({
      ok: true,
      contract: 'AEO WordPress live remains on restored bridge and protected heroans hash is stable',
      expectedHeroansHash,
      payload,
    }, null, 2))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

try {
  main()
} catch (error) {
  console.error(`public-website:verify-aeo-wordpress-guards failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
