#!/usr/bin/env bash
# Rehearsal of the TASK-2050 rollout in WordPress Playground (local, throwaway site), with the exact scripts and package
# that would run on Kinsta: the LIVE copy of efeonce-editorial-blocks (from an exported baseline) active, a few seeded
# posts, then deploy dry-run → deploy apply → read-only verifier → backfill dry-run → apply (one batch) → restore from the
# ledger → verifier. A tiny WP_CLI shim stands in for WP-CLI; nothing touches the live site.
#
#   pnpm public-website:export-live-code -- --output tmp/public-site-code-baselines/<name>
#   node scripts/public-website/build-blog-v3-content-model-package.cjs tmp/public-site-code-baselines/<name>
#   bash scripts/public-website/blog-v3/rehearse-content-model-deploy.sh tmp/public-site-code-baselines/<name> [out dir]
#
# Output: one JSON per step in the out dir (deploy-dry-run, deploy-apply, verify-1, backfill-dry-run, backfill-apply,
# backfill-restore, verify-2) and summary.json.
set -euo pipefail
gh="$(cd "$(dirname "$0")/../../.." && pwd)"
baseline="$(cd "$1" && pwd)"
out="${2:-$(mktemp -d)}"
mkdir -p "$out"
out="$(cd "$out" && pwd)"
work="$(mktemp -d)"
cp -R "$baseline/code/wp-content/plugins/efeonce-editorial-blocks" "$work/plugin"
cp "$gh/tmp/blog-v3-content-model-release/package.zip" "$gh/tmp/blog-v3-content-model-release/manifest.json" "$work/"
printf 'dry-run' > "$work/dry-run.txt"

# Runs one governed script with the WP_CLI shim: rehearse <script> <output name> <inputs...>
cat > "$work/run.php" <<'PHP'
<?php
// Usage inside runPHP: $job = array( 'script' => ..., 'out' => ..., 'args' => array( ... ) ); require '/w/run.php';
if ( ! class_exists( 'WP_CLI' ) ) {
	class WP_CLI {
		public static function error( $m ) { throw new RuntimeException( (string) $m ); }
		public static function warning( $m ) { echo wp_json_encode( array( 'warning' => (string) $m ) ), "\n"; }
	}
}
require_once '/wordpress/wp-load.php';
wp_set_current_user( 1 );
$args = $job['args'];
ob_start();
try {
	( static function ( $args ) use ( $job ) { include $job['script']; } )( $args );
	$body = ob_get_clean();
} catch ( Throwable $e ) {
	$body = wp_json_encode( array( 'error' => $e->getMessage() ) );
	ob_end_clean();
}
file_put_contents( '/out/' . $job['out'] . '.json', $body );
PHP

cat > "$work/seed.php" <<'PHP'
<?php
require_once '/wordpress/wp-load.php';
$c = array();
foreach ( array( 'glitch' => 'Glitch', 'hubspot' => 'HubSpot', 'aeo' => 'AEO' ) as $slug => $name ) {
	$t = wp_insert_term( $name, 'category', array( 'slug' => $slug ) );
	$c[ $slug ] = (int) $t['term_id'];
}
foreach ( array(
	array( 'Glitch Flash: Sonnet 5.5 roza a Opus, a mitad de precio', 'glitch-flash-claude-sonnet-5-5', 'glitch' ),
	array( 'Glitch #17: Agente rompe la jaula', 'glitch-17-modelo', 'glitch' ),
	array( 'GPT-5.6 y ChatGPT Work: OpenAI ya no está lanzando modelos', 'gpt-5-6', 'glitch' ),
	array( 'Un dashboard no arregla un proceso comercial', 'dashboards-hubspot-confiables-caso-anam', 'hubspot' ),
	array( 'Cómo Rastrear y Medir Formularios de HubSpot en GA4: Guía Paso a Paso', 'medir-formularios-hubspot-ga4', 'hubspot' ),
	array( 'El fin de la web “solo para humanos”', 'web-agentica-agentes-ia', 'aeo' ),
) as $p ) {
	wp_insert_post( array( 'post_type' => 'post', 'post_status' => 'publish', 'post_title' => $p[0], 'post_name' => $p[1], 'post_category' => array( $c[ $p[2] ] ), 'post_content' => 'Texto.' ) );
}
file_put_contents( '/out/seed.json', wp_json_encode( array( 'plugin_version' => get_plugin_data( WP_PLUGIN_DIR . '/efeonce-editorial-blocks/efeonce-editorial-blocks.php' )['Version'] ?? null, 'eo_format' => taxonomy_exists( 'eo_format' ) ) ) );
PHP

step() { # step <script> <out> <PHP array of input paths>
  printf '{ "step": "runPHP", "code": "<?php $job = array( \\"script\\" => \\"%s\\", \\"out\\" => \\"%s\\", \\"args\\" => %s ); require \\"/w/run.php\\";" }' "$1" "$2" "$3"
}
cat > "$work/apply-options.php" <<'PHP'
<?php
// Builds the apply options from the reviewed dry-run (expect_sha256 = the proposal hash) and the restore input.
$dry = json_decode( file_get_contents( '/out/backfill-dry-run.json' ), true );
file_put_contents( '/w/apply.json', json_encode( array( 'mode' => 'apply', 'batch' => 10, 'expect_sha256' => $dry['proposal_sha256'] ?? '', 'overrides' => array() ) ) );
file_put_contents( '/w/restore.json', json_encode( array( 'mode' => 'restore' ) ) );
PHP

deploy='/gh/scripts/public-website/deploy-blog-v3-content-model-package.php'
verify='/gh/scripts/public-website/blog-v3/verify-content-model.php'
backfill='/gh/scripts/public-website/blog-v3/backfill-format.php'
cat > "$work/blueprint.json" <<JSON
{
  "steps": [
    { "step": "activatePlugin", "pluginPath": "efeonce-editorial-blocks/efeonce-editorial-blocks.php" },
    { "step": "runPHP", "code": "<?php require '/w/seed.php';" },
    $(step "$deploy" deploy-dry-run "array( '/w/package.zip', '/w/manifest.json', '/w/dry-run.txt' )"),
    $(step "$deploy" deploy-apply "array( '/w/package.zip', '/w/manifest.json' )"),
    $(step "$verify" verify-1 "array()"),
    $(step "$backfill" backfill-dry-run "array( '/gh/scripts/public-website/blog-v3/backfill/dry-run.json' )"),
    { "step": "runPHP", "code": "<?php require '/w/apply-options.php';" },
    $(step "$backfill" backfill-apply "array( '/w/apply.json' )"),
    $(step "$verify" verify-2 "array()"),
    $(step "$backfill" backfill-restore "array( '/w/restore.json', '/out/backfill-apply.json' )"),
    $(step "$verify" verify-3 "array()")
  ]
}
JSON
npx -y @wp-playground/cli@latest run-blueprint --blueprint="$work/blueprint.json" \
  --mount="$work/plugin:/wordpress/wp-content/plugins/efeonce-editorial-blocks" \
  --mount="$work:/w" --mount="$gh:/gh" --mount="$out:/out" >"$out/playground.log" 2>&1 || { tail -30 "$out/playground.log"; exit 1; }
node -e '
const fs = require("fs"), d = process.argv[1], j = n => { try { return JSON.parse(fs.readFileSync(d + "/" + n + ".json", "utf8")) } catch (e) { return { unreadable: String(e) } } };
const s = { seed: j("seed"), deployDry: j("deploy-dry-run").status, deploy: j("deploy-apply").status, flagAfterDeploy: j("deploy-apply").flag, verify1: { ok: j("verify-1").ok, withoutFormat: j("verify-1").posts?.without_format }, dry: { toSet: j("backfill-dry-run").to_set, summary: j("backfill-dry-run").summary }, apply: { applied: j("backfill-apply").applied, remaining: j("backfill-apply").remaining }, verify2: { ok: j("verify-2").ok, withoutFormat: j("verify-2").posts?.without_format }, restore: (j("backfill-restore").entries || []).length, verify3: { withoutFormat: j("verify-3").posts?.without_format } };
fs.writeFileSync(d + "/summary.json", JSON.stringify(s, null, 2)); console.log(JSON.stringify(s, null, 2));
' "$out"
rm -rf "$work"
