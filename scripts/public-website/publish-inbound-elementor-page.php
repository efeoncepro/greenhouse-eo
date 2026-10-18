<?php
/**
 * Publishes the Inbound Marketing modules (rediseño 2026-10-18) with Ohio's own header and footer.
 * Inputs (files, the wpcli wrapper forwards only files): <page-custom.css> (inbound-source/page-custom.css, __ID__ = page id),
 * <form.json> ({ "formKey", "surface" }), <spec.json> and, optionally, <meeting.json> (the 0600 file written by
 * scripts/growth/publish-inbound-meeting-cta.ts: { surfaceId, embedKey }) for the native meeting launcher:
 *   { "mode": "preview" }                                 → creates /inbound-preview-20261018/ (publish, noindex, not in menus) for QA.
 *   { "mode": "replace", "pageId": 242601, "expectedDataSha": "<sha256 of the live _elementor_data>" }
 *                                                          → replaces the body of /agencia-inbound-marketing/ in place.
 * Replace snapshots the previous Elementor data/settings, featured image, Ohio page_* metas and Yoast metas into
 * `_gh_inbound_v2_before_<UTC>` (JSON) before writing; Ohio page_* metas are copied from Performance (251997).
 * Rollback (replace): restore the snapshot with rollback-inbound-elementor-page.php, purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( ! in_array( count( $args ?? array() ), array( 3, 4 ), true ) ) { WP_CLI::error( 'Expected: <page-custom.css> <form.json> <spec.json> [<meeting.json>].' ); }
$template     = trim( (string) file_get_contents( $args[0] ) );
$form         = json_decode( (string) file_get_contents( $args[1] ), true );
$spec         = json_decode( (string) file_get_contents( $args[2] ), true );
$form_key     = (string) ( $form['formKey'] ?? '' );
$form_surface = (string) ( $form['surface'] ?? '' );
$mode         = (string) ( $spec['mode'] ?? '' );
$meeting      = isset( $args[3] ) ? json_decode( (string) file_get_contents( $args[3] ), true ) : array();
$meeting_surface = (string) ( $meeting['surfaceId'] ?? '' );
$meeting_key     = (string) ( $meeting['embedKey'] ?? '' );
if ( isset( $args[3] ) && ( ! preg_match( '/^csur-[0-9a-f-]{36}$/', $meeting_surface ) || strlen( $meeting_key ) < 20 ) ) { WP_CLI::error( 'Invalid meeting CTA surface or key.' ); }
if ( ! preg_match( '/^[0-9a-f-]{36}$/', $form_key ) || ! preg_match( '/^fhsf-[a-z0-9-]+$/', $form_surface ) ) { WP_CLI::error( 'Invalid form key or surface.' ); }
if ( ! in_array( $mode, array( 'preview', 'replace' ), true ) ) { WP_CLI::error( 'Unknown mode.' ); }
if ( false === strpos( $template, '__ID__' ) || preg_match( '/<\/?(script|style)/i', $template ) ) { WP_CLI::error( 'Unexpected custom CSS input.' ); }

$modules = array(
	'hero' => '01 · Hero', 'confianza' => '02 · Partner y clientes', 'partida' => '03 · El punto de partida', 'vivo' => '04 · No murió',
	'cambio' => '05 · El cambio de fondo', 'rompe' => '06 · ¿Dónde se te rompe?', 'metodo' => '07 · Cómo trabajamos', 'ciclo' => '08 · Arma tu primer ciclo',
	'planes' => '09 · Formas de empezar', 'reglas' => '10 · Lo que no te vamos a prometer', 'diagnostico' => '11 · Diagnóstico, reunión y preguntas',
);
$light   = array( 'vivo' );
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach ( array_keys( $modules ) as $module ) {
	if ( ! isset( $widgets[ 'greenhouse_inbound_' . $module ] ) ) { WP_CLI::error( 'Widget absent: greenhouse_inbound_' . $module ); }
	try {
		$widgets[ 'greenhouse_inbound_' . $module ]->get_controls();
		$probe = EO_Inbound_Landing_Base_Widget::render_module( $module, array( 'form_key' => $form_key, 'form_surface' => $form_surface, 'meeting_surface' => $meeting_surface, 'meeting_embed_key' => $meeting_key ), 'preflight' );
		if ( '' === $probe || preg_match( '/%%[^%\s]+%%/', $probe ) ) { WP_CLI::error( 'Render preflight failed: ' . $module ); }
	} catch ( \Throwable $e ) {
		WP_CLI::error( 'Control preflight failed for ' . $module . ': ' . $e->getMessage() );
	}
}

$home      = (int) get_option( 'page_on_front' );
$protected = array();
foreach ( array( $home, 249582, 251279, 251981, 251997, 244079 ) as $post_id ) { $protected[ $post_id ] = hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ); }
$shell = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $option ) { $shell[ $option ] = get_option( $option ); }

$snapshot_key = '';
if ( 'preview' === $mode ) {
	if ( get_page_by_path( 'inbound-preview-20261018', OBJECT, 'page' ) ) { WP_CLI::error( 'Preview page already exists. Inspect before retry.' ); }
	$id = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'draft', 'post_title' => 'Inbound Marketing (preview)', 'post_name' => 'inbound-preview-20261018', 'post_author' => get_current_user_id() ), true );
	if ( is_wp_error( $id ) ) { WP_CLI::error( 'Page creation failed: ' . $id->get_error_message() ); }
	update_post_meta( $id, '_yoast_wpseo_meta-robots-noindex', '1' );
	update_post_meta( $id, '_yoast_wpseo_meta-robots-nofollow', '1' );
} else {
	$id = (int) ( $spec['pageId'] ?? 0 );
	if ( 242601 !== $id || get_post_field( 'post_name', $id ) !== 'agencia-inbound-marketing' || get_post_status( $id ) !== 'publish' ) { WP_CLI::error( 'Target page drift.' ); }
	$live_sha = hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) );
	if ( ! hash_equals( (string) ( $spec['expectedDataSha'] ?? '' ), $live_sha ) ) { WP_CLI::error( 'Live Elementor data changed since discovery: ' . $live_sha ); }
	$before = array( 'post_title' => get_post_field( 'post_title', $id ) );
	foreach ( get_post_meta( $id ) as $key => $values ) {
		if ( in_array( $key, array( '_elementor_data', '_elementor_page_settings', '_elementor_edit_mode', '_elementor_template_type', '_elementor_version', '_thumbnail_id', '_wp_page_template' ), true ) || 0 === strpos( $key, 'page_' ) || 0 === strpos( $key, '_yoast_wpseo_' ) ) {
			$before[ $key ] = $values[0];
		}
	}
	$snapshot_key = '_gh_inbound_v2_before_' . gmdate( 'Ymd_His' );
	update_post_meta( $id, $snapshot_key, wp_slash( wp_json_encode( $before ) ) );
	if ( '' === (string) get_post_meta( $id, $snapshot_key, true ) ) { WP_CLI::error( 'Snapshot failed; nothing changed.' ); }
}
update_post_meta( $id, '_elementor_edit_mode', 'builder' );
update_post_meta( $id, '_elementor_template_type', 'wp-page' );
update_post_meta( $id, '_wp_page_template', 'default' );

$zero     = array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true );
$elements = array();
foreach ( $modules as $module => $title ) {
	$widget_settings = array( '_title' => $title, '_margin' => $zero, '_padding' => $zero );
	if ( 'diagnostico' === $module ) { $widget_settings += array( 'form_key' => $form_key, 'form_surface' => $form_surface ); }
	if ( in_array( $module, array( 'hero', 'diagnostico' ), true ) && '' !== $meeting_key ) { $widget_settings += array( 'meeting_surface' => $meeting_surface, 'meeting_embed_key' => $meeting_key ); }
	$scheme     = in_array( $module, $light, true ) ? 'clb__light_section' : 'clb__dark_section';
	$elements[] = array(
		'id' => substr( md5( 'inbound-section-' . $module ), 0, 7 ), 'elType' => 'container', 'isInner' => false,
		'settings' => array(
			'_title' => $title, 'content_width' => 'full', 'flex_direction' => 'column',
			'flex_gap' => array( 'column' => '0', 'row' => '0', 'unit' => 'px', 'isLinked' => true ),
			'padding' => $zero, 'margin' => $zero,
			'css_classes' => 'gh-inbound-section ' . $scheme,
		),
		'elements' => array( array( 'id' => substr( md5( 'inbound-widget-' . $module ), 0, 7 ), 'elType' => 'widget', 'widgetType' => 'greenhouse_inbound_' . $module, 'settings' => $widget_settings, 'elements' => array() ) ),
	);
}
$document = \Elementor\Plugin::$instance->documents->get( $id, false );
if ( ! $document ) { WP_CLI::error( 'Elementor document unavailable for ' . $id ); }
$settings               = 'preview' === $mode ? $document->get_settings() : array();
$settings['hide_title'] = 'yes';
$settings['custom_css'] = str_replace( '__ID__', (string) $id, $template );
if ( false === $document->save( array( 'elements' => $elements, 'settings' => $settings ) ) ) { WP_CLI::error( 'Elementor save failed for ' . $id ); }

// Ohio page contract: the same verified page_* metas as Performance (dark hero, light header, full bleed, no sidebar).
$source_metas = array();
foreach ( get_post_meta( 251997 ) as $key => $values ) { if ( 0 === strpos( $key, 'page_' ) ) { $source_metas[ $key ] = $values[0]; } }
if ( count( $source_metas ) < 20 ) { WP_CLI::error( 'Ohio meta source drift (251997).' ); }
foreach ( get_post_meta( $id ) as $key => $values ) { if ( 0 === strpos( $key, 'page_' ) && ! isset( $source_metas[ $key ] ) ) { delete_post_meta( $id, $key ); } }
foreach ( $source_metas as $key => $value ) { update_post_meta( $id, $key, wp_slash( maybe_unserialize( $value ) ) ); }

$actual = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
if ( ! is_array( $actual ) || count( $actual ) !== count( $modules ) ) { WP_CLI::error( 'Unexpected saved document for ' . $id . ( $snapshot_key ? '. Restore ' . $snapshot_key : '' ) ); }
foreach ( array_keys( $modules ) as $index => $module ) {
	if ( ( $actual[ $index ]['elements'][0]['widgetType'] ?? '' ) !== 'greenhouse_inbound_' . $module ) { WP_CLI::error( 'Widget readback failed for ' . $id ); }
}
foreach ( $protected as $post_id => $hash ) { if ( ! hash_equals( $hash, hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Unrelated page changed: ' . $post_id ); } }
foreach ( $shell as $key => $value ) { if ( get_option( $key ) !== $value ) { WP_CLI::error( 'Global site chrome changed: ' . $key ); } }

if ( 'preview' === $mode ) {
	$published = wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ), true );
	if ( is_wp_error( $published ) ) { WP_CLI::error( 'Publish failed: ' . $published->get_error_message() ); }
}
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => $mode . '_verified', 'postId' => $id, 'url' => get_permalink( $id ), 'snapshot' => $snapshot_key, 'meetingLauncher' => '' !== $meeting_key, 'hash' => hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) ), 'widgets' => count( $actual ), 'protectedUnchanged' => true, 'globalChromePreserved' => true ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
