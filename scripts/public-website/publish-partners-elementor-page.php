<?php
/**
 * Publishes the Partners modules (rediseño 2026-10-23, canvas «Partners — Efeonce» v14) between the site's canonical
 * navigation and Ohio footer. Inputs (files, the wpcli wrapper forwards only files): <page-custom.css>
 * (partners-source/page-custom.css, __ID__ = page id) and <spec.json>:
 *   { "mode": "preview" }                                 → creates /partners-preview-20261023/ (publish, noindex, not in menus) for QA.
 *   { "mode": "replace", "pageId": 248003, "expectedDataSha": "<sha256 of the live _elementor_data>" }
 *                                                          → replaces the body of /partnership/ in place.
 * Replace snapshots the previous Elementor data/settings, featured image, Ohio page_* metas and Yoast metas into
 * `_gh_partners_v2_before_<UTC>` (JSON) before writing; Ohio page_* metas are copied from Performance (251997).
 * The featured image is read before Document::save() and restored/verified after it (an empty page-settings payload
 * deletes it). Rollback (replace): rollback-partners-elementor-page.php with the snapshot key, purge Kinsta.
 * Optional third input <cta.json> (the 0600 file written by scripts/growth/publish-partners-become-partner-cta.ts:
 * { surfaceId, embedKey }) arms «Quiero ser partner» in «cierre» with the governed Growth CTA; without it the button
 * degrades to /agenda/. The key is written into the widget settings only, never into git or logs.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( ! in_array( count( $args ?? array() ), array( 2, 3 ), true ) ) { WP_CLI::error( 'Expected: <page-custom.css> <spec.json> [<cta.json>].' ); }
$template = trim( (string) file_get_contents( $args[0] ) );
$spec     = json_decode( (string) file_get_contents( $args[1] ), true );
$mode     = (string) ( $spec['mode'] ?? '' );
$cta      = isset( $args[2] ) ? json_decode( (string) file_get_contents( $args[2] ), true ) : array();
$cta_surface = (string) ( $cta['surfaceId'] ?? '' );
$cta_key     = (string) ( $cta['embedKey'] ?? '' );
if ( isset( $args[2] ) && ( ! preg_match( '/^csur-[0-9a-f-]{36}$/', $cta_surface ) || strlen( $cta_key ) < 20 ) ) { WP_CLI::error( 'Invalid partner CTA surface or key.' ); }
if ( ! in_array( $mode, array( 'preview', 'replace' ), true ) ) { WP_CLI::error( 'Unknown mode.' ); }
if ( false === strpos( $template, '__ID__' ) || preg_match( '/<\/?(script|style)/i', $template ) ) { WP_CLI::error( 'Unexpected custom CSS input.' ); }

$modules = array(
	'hero' => '01 · Hero', 'verdad' => '02 · Que todo converse', 'ecosistema' => '03 · El ecosistema',
	'banda' => '04 · Empieza el trabajo', 'como' => '05 · Cómo trabajamos', 'cierre' => '06 · Cierre',
);
$light   = array();
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach ( array_keys( $modules ) as $module ) {
	if ( ! isset( $widgets[ 'greenhouse_partners_' . $module ] ) ) { WP_CLI::error( 'Widget absent: greenhouse_partners_' . $module ); }
	try {
		$widgets[ 'greenhouse_partners_' . $module ]->get_controls();
		$probe = EO_Partners_Landing_Base_Widget::render_module( $module, array( 'meeting_surface' => $cta_surface, 'meeting_embed_key' => $cta_key ), 'preflight' );
		if ( '' === $probe || preg_match( '/%%[^%\s]+%%/', $probe ) ) { WP_CLI::error( 'Render preflight failed: ' . $module ); }
	} catch ( \Throwable $e ) {
		WP_CLI::error( 'Control preflight failed for ' . $module . ': ' . $e->getMessage() );
	}
}

$home      = (int) get_option( 'page_on_front' );
$protected = array();
foreach ( array( $home, 249582, 251279, 251981, 251997, 244079, 242601, 251583, 249770 ) as $post_id ) { $protected[ $post_id ] = hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ); }
$shell = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $option ) { $shell[ $option ] = get_option( $option ); }

$snapshot_key = '';
if ( 'preview' === $mode ) {
	if ( get_page_by_path( 'partners-preview-20261023', OBJECT, 'page' ) ) { WP_CLI::error( 'Preview page already exists. Inspect before retry.' ); }
	$id = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'draft', 'post_title' => 'Partners (preview)', 'post_name' => 'partners-preview-20261023', 'post_author' => get_current_user_id() ), true );
	if ( is_wp_error( $id ) ) { WP_CLI::error( 'Page creation failed: ' . $id->get_error_message() ); }
	update_post_meta( $id, '_yoast_wpseo_meta-robots-noindex', '1' );
	update_post_meta( $id, '_yoast_wpseo_meta-robots-nofollow', '1' );
} else {
	$id = (int) ( $spec['pageId'] ?? 0 );
	if ( 248003 !== $id || get_post_field( 'post_name', $id ) !== 'partnership' || get_post_status( $id ) !== 'publish' ) { WP_CLI::error( 'Target page drift.' ); }
	$live_sha = hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) );
	if ( ! hash_equals( (string) ( $spec['expectedDataSha'] ?? '' ), $live_sha ) ) { WP_CLI::error( 'Live Elementor data changed since discovery: ' . $live_sha ); }
	$before = array( 'post_title' => get_post_field( 'post_title', $id ) );
	foreach ( get_post_meta( $id ) as $key => $values ) {
		if ( in_array( $key, array( '_elementor_data', '_elementor_page_settings', '_elementor_edit_mode', '_elementor_template_type', '_elementor_version', '_thumbnail_id', '_wp_page_template' ), true ) || 0 === strpos( $key, 'page_' ) || 0 === strpos( $key, '_yoast_wpseo_' ) ) {
			$before[ $key ] = $values[0];
		}
	}
	$snapshot_key = '_gh_partners_v2_before_' . gmdate( 'Ymd_His' );
	update_post_meta( $id, $snapshot_key, wp_slash( wp_json_encode( $before ) ) );
	if ( '' === (string) get_post_meta( $id, $snapshot_key, true ) ) { WP_CLI::error( 'Snapshot failed; nothing changed.' ); }
}
$thumbnail = (int) get_post_meta( $id, '_thumbnail_id', true );
update_post_meta( $id, '_elementor_edit_mode', 'builder' );
update_post_meta( $id, '_elementor_template_type', 'wp-page' );
update_post_meta( $id, '_wp_page_template', 'default' );

$zero     = array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true );
$elements = array();
foreach ( $modules as $module => $title ) {
	$scheme          = in_array( $module, $light, true ) ? 'clb__light_section' : 'clb__dark_section';
	$widget_settings = array( '_title' => $title, '_margin' => $zero, '_padding' => $zero );
	if ( 'cierre' === $module && '' !== $cta_key ) { $widget_settings += array( 'meeting_surface' => $cta_surface, 'meeting_embed_key' => $cta_key ); }
	$elements[] = array(
		'id' => substr( md5( 'partners-section-' . $module ), 0, 7 ), 'elType' => 'container', 'isInner' => false,
		'settings' => array(
			'_title' => $title, 'content_width' => 'full', 'flex_direction' => 'column',
			'flex_gap' => array( 'column' => '0', 'row' => '0', 'unit' => 'px', 'isLinked' => true ),
			'padding' => $zero, 'margin' => $zero,
			'css_classes' => 'gh-partners-section ' . $scheme,
		),
		'elements' => array( array( 'id' => substr( md5( 'partners-widget-' . $module ), 0, 7 ), 'elType' => 'widget', 'widgetType' => 'greenhouse_partners_' . $module, 'settings' => $widget_settings, 'elements' => array() ) ),
	);
}
$document = \Elementor\Plugin::$instance->documents->get( $id, false );
if ( ! $document ) { WP_CLI::error( 'Elementor document unavailable for ' . $id ); }
$settings               = 'preview' === $mode ? $document->get_settings() : array();
$settings['hide_title'] = 'yes';
$settings['custom_css'] = str_replace( '__ID__', (string) $id, $template );
if ( $thumbnail > 0 ) { $settings['post_featured_image'] = array( 'id' => $thumbnail, 'url' => (string) wp_get_attachment_url( $thumbnail ) ); }
if ( false === $document->save( array( 'elements' => $elements, 'settings' => $settings ) ) ) { WP_CLI::error( 'Elementor save failed for ' . $id ); }
if ( $thumbnail > 0 && (int) get_post_meta( $id, '_thumbnail_id', true ) !== $thumbnail ) { update_post_meta( $id, '_thumbnail_id', $thumbnail ); }
if ( $thumbnail > 0 && (int) get_post_meta( $id, '_thumbnail_id', true ) !== $thumbnail ) { WP_CLI::error( 'Featured image lost after save' . ( $snapshot_key ? '. Restore ' . $snapshot_key : '' ) ); }

// Ohio page contract: the same verified page_* metas as Performance (dark hero, full bleed, no sidebar).
$source_metas = array();
foreach ( get_post_meta( 251997 ) as $key => $values ) { if ( 0 === strpos( $key, 'page_' ) ) { $source_metas[ $key ] = $values[0]; } }
if ( count( $source_metas ) < 20 ) { WP_CLI::error( 'Ohio meta source drift (251997).' ); }
foreach ( get_post_meta( $id ) as $key => $values ) { if ( 0 === strpos( $key, 'page_' ) && ! isset( $source_metas[ $key ] ) ) { delete_post_meta( $id, $key ); } }
foreach ( $source_metas as $key => $value ) { update_post_meta( $id, $key, wp_slash( maybe_unserialize( $value ) ) ); }

$actual = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
if ( ! is_array( $actual ) || count( $actual ) !== count( $modules ) ) { WP_CLI::error( 'Unexpected saved document for ' . $id . ( $snapshot_key ? '. Restore ' . $snapshot_key : '' ) ); }
foreach ( array_keys( $modules ) as $index => $module ) {
	if ( ( $actual[ $index ]['elements'][0]['widgetType'] ?? '' ) !== 'greenhouse_partners_' . $module ) { WP_CLI::error( 'Widget readback failed for ' . $id ); }
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
echo wp_json_encode( array( 'status' => $mode . '_verified', 'postId' => $id, 'url' => get_permalink( $id ), 'snapshot' => $snapshot_key, 'thumbnail' => (int) get_post_meta( $id, '_thumbnail_id', true ), 'hash' => hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) ), 'widgets' => count( $actual ), 'protectedUnchanged' => true, 'globalChromePreserved' => true ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
