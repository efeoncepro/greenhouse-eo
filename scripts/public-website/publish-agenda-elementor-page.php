<?php
/**
 * Replaces the body of /agenda/ (251583) with the Agenda landing (rediseño 2026-10-20, «La órbita») and keeps the real
 * native scheduler: the pilot's host adapter for <efeonce-meeting-scheduler> (surface fhsf-efeonce-lead-gen-web,
 * scheduler discovery) goes in its own HTML widget between the hero and «Cómo es la reunión».
 * Inputs (files): <page-custom.css> (agenda-source/page-custom.css, __ID__ = page id), <scheduler-host.html>
 * (agenda-source/scheduler-host.html) and <spec.json> { "pageId": 251583, "expectedDataSha": "<sha256 of live _elementor_data>" }.
 * Snapshots the previous Elementor data/settings, featured image, Ohio page_* metas and Yoast metas into
 * `_gh_agenda_v2_before_<UTC>` (JSON) before writing; Ohio page_* metas are copied from Performance (251997, dark hero
 * with Ohio's own header). Yoast metas (noindex) are not touched. Header and footer stay Ohio's global ones.
 * Rollback: rollback-agenda-elementor-page.php with the printed snapshot key, then purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 3 ) { WP_CLI::error( 'Expected: <page-custom.css> <scheduler-host.html> <spec.json>.' ); }
$template = trim( (string) file_get_contents( $args[0] ) );
$host     = trim( (string) file_get_contents( $args[1] ) );
$spec     = json_decode( (string) file_get_contents( $args[2] ), true );
if ( false === strpos( $template, '__ID__' ) || preg_match( '/<\/?(script|style)/i', $template ) ) { WP_CLI::error( 'Unexpected custom CSS input.' ); }
// The host must mount exactly the governed scheduler from the public renderer lane, and never a provider link.
if ( 1 !== substr_count( $host, '<efeonce-meeting-scheduler' ) || false === strpos( $host, 'surface="fhsf-efeonce-lead-gen-web"' ) || false === strpos( $host, 'scheduler-key="discovery"' )
	|| false === strpos( $host, 'src="https://efeonce-public-renderers.vercel.app/loader.js"' ) || false !== stripos( $host, 'meetings.hubspot.com' ) || false === strpos( $host, 'id="agenda"' ) ) {
	WP_CLI::error( 'Unexpected scheduler host input.' );
}

$modules = array( 'hero' => '01 · Hero', 'como' => '03 · Cómo es la reunión', 'preguntas' => '04 · Preguntas', 'cierre' => '05 · Cierre' );
$light   = array( 'como', 'preguntas' );
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach ( array_keys( $modules ) as $module ) {
	if ( ! isset( $widgets[ 'greenhouse_agenda_' . $module ] ) ) { WP_CLI::error( 'Widget absent: greenhouse_agenda_' . $module ); }
	try {
		$widgets[ 'greenhouse_agenda_' . $module ]->get_controls();
		$probe = EO_Agenda_Landing_Base_Widget::render_module( $module, array(), 'preflight' );
		if ( '' === $probe || preg_match( '/%%[^%\s]+%%/', $probe ) ) { WP_CLI::error( 'Render preflight failed: ' . $module ); }
	} catch ( \Throwable $e ) {
		WP_CLI::error( 'Control preflight failed for ' . $module . ': ' . $e->getMessage() );
	}
}

$home      = (int) get_option( 'page_on_front' );
$protected = array();
foreach ( array( $home, 242601, 251997, 244079, 20729 ) as $post_id ) { $protected[ $post_id ] = hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ); }
$shell = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $option ) { $shell[ $option ] = get_option( $option ); }

$id = (int) ( $spec['pageId'] ?? 0 );
if ( 251583 !== $id || get_post_field( 'post_name', $id ) !== 'agenda' || get_post_status( $id ) !== 'publish' ) { WP_CLI::error( 'Target page drift.' ); }
$live_sha = hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) );
if ( ! hash_equals( (string) ( $spec['expectedDataSha'] ?? '' ), $live_sha ) ) { WP_CLI::error( 'Live Elementor data changed since discovery: ' . $live_sha ); }
$before = array( 'post_title' => get_post_field( 'post_title', $id ) );
foreach ( get_post_meta( $id ) as $key => $values ) {
	if ( in_array( $key, array( '_elementor_data', '_elementor_page_settings', '_elementor_edit_mode', '_elementor_template_type', '_elementor_version', '_thumbnail_id', '_wp_page_template' ), true ) || 0 === strpos( $key, 'page_' ) || 0 === strpos( $key, '_yoast_wpseo_' ) ) {
		$before[ $key ] = $values[0];
	}
}
$snapshot_key = '_gh_agenda_v2_before_' . gmdate( 'Ymd_His' );
update_post_meta( $id, $snapshot_key, wp_slash( wp_json_encode( $before ) ) );
if ( '' === (string) get_post_meta( $id, $snapshot_key, true ) ) { WP_CLI::error( 'Snapshot failed; nothing changed.' ); }

update_post_meta( $id, '_elementor_edit_mode', 'builder' );
update_post_meta( $id, '_elementor_template_type', 'wp-page' );
update_post_meta( $id, '_wp_page_template', 'default' );

$zero      = array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true );
$container = static function ( $key, $title, $scheme, $widget ) use ( $zero ) {
	return array(
		'id' => substr( md5( 'agenda-section-' . $key ), 0, 7 ), 'elType' => 'container', 'isInner' => false,
		'settings' => array(
			'_title' => $title, 'content_width' => 'full', 'flex_direction' => 'column',
			'flex_gap' => array( 'column' => '0', 'row' => '0', 'unit' => 'px', 'isLinked' => true ),
			'padding' => $zero, 'margin' => $zero,
			'css_classes' => 'gh-agenda-section ' . $scheme,
		),
		'elements' => array( $widget ),
	);
};
$module_widget = static function ( $module, $title ) use ( $zero ) {
	return array( 'id' => substr( md5( 'agenda-widget-' . $module ), 0, 7 ), 'elType' => 'widget', 'widgetType' => 'greenhouse_agenda_' . $module, 'settings' => array( '_title' => $title, '_margin' => $zero, '_padding' => $zero ), 'elements' => array() );
};
$elements   = array();
$elements[] = $container( 'hero', $modules['hero'], 'clb__dark_section', $module_widget( 'hero', $modules['hero'] ) );
$elements[] = $container( 'scheduler', '02 · Agendador nativo', 'clb__light_section', array( 'id' => substr( md5( 'agenda-widget-scheduler' ), 0, 7 ), 'elType' => 'widget', 'widgetType' => 'html', 'settings' => array( '_title' => '02 · Agendador nativo (Growth Meetings)', 'html' => $host, '_margin' => $zero, '_padding' => $zero ), 'elements' => array() ) );
foreach ( array( 'como', 'preguntas', 'cierre' ) as $module ) {
	$elements[] = $container( $module, $modules[ $module ], in_array( $module, $light, true ) ? 'clb__light_section' : 'clb__dark_section', $module_widget( $module, $modules[ $module ] ) );
}

$document = \Elementor\Plugin::$instance->documents->get( $id, false );
if ( ! $document ) { WP_CLI::error( 'Elementor document unavailable for ' . $id ); }
$settings = array( 'hide_title' => 'yes', 'custom_css' => str_replace( '__ID__', (string) $id, $template ) );
if ( false === $document->save( array( 'elements' => $elements, 'settings' => $settings ) ) ) { WP_CLI::error( 'Elementor save failed for ' . $id . '. Restore ' . $snapshot_key ); }

// Ohio page contract: the same verified page_* metas as Performance (dark hero, Ohio's header and footer, full bleed, no sidebar).
$source_metas = array();
foreach ( get_post_meta( 251997 ) as $key => $values ) { if ( 0 === strpos( $key, 'page_' ) ) { $source_metas[ $key ] = $values[0]; } }
if ( count( $source_metas ) < 20 ) { WP_CLI::error( 'Ohio meta source drift (251997). Restore ' . $snapshot_key ); }
foreach ( get_post_meta( $id ) as $key => $values ) { if ( 0 === strpos( $key, 'page_' ) && ! isset( $source_metas[ $key ] ) ) { delete_post_meta( $id, $key ); } }
foreach ( $source_metas as $key => $value ) { update_post_meta( $id, $key, wp_slash( maybe_unserialize( $value ) ) ); }

$actual   = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
$expected = array( 'greenhouse_agenda_hero', 'html', 'greenhouse_agenda_como', 'greenhouse_agenda_preguntas', 'greenhouse_agenda_cierre' );
if ( ! is_array( $actual ) || count( $actual ) !== count( $expected ) ) { WP_CLI::error( 'Unexpected saved document for ' . $id . '. Restore ' . $snapshot_key ); }
foreach ( $expected as $index => $type ) {
	if ( ( $actual[ $index ]['elements'][0]['widgetType'] ?? '' ) !== $type ) { WP_CLI::error( 'Widget readback failed for ' . $id . '. Restore ' . $snapshot_key ); }
}
foreach ( $protected as $post_id => $hash ) { if ( ! hash_equals( $hash, hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Unrelated page changed: ' . $post_id ); } }
foreach ( $shell as $key => $value ) { if ( get_option( $key ) !== $value ) { WP_CLI::error( 'Global site chrome changed: ' . $key ); } }

clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'replace_verified', 'postId' => $id, 'url' => get_permalink( $id ), 'snapshot' => $snapshot_key, 'hash' => hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) ), 'containers' => count( $actual ), 'noindex' => get_post_meta( $id, '_yoast_wpseo_meta-robots-noindex', true ), 'protectedUnchanged' => true, 'globalChromePreserved' => true ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
