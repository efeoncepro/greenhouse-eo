<?php
/**
 * Governed republisher for a published source-led landing (one container + one greenhouse_<landing>_<module> widget per
 * section, as created by publish-<landing>-elementor-page.php). Changes the page body only when the live tree still is
 * the one that was inspected, keeps what the editor changed, and never loses the featured image.
 *
 * Inputs (files, the wpcli wrapper forwards files only):
 *   1. spec JSON:
 *      {
 *        "pageId": 251997, "slug": "performance-marketing", "parentId": 251077,
 *        "landing": "performance", "baseClass": "EO_Performance_Landing_Base_Widget",
 *        "modules": [["hero", "01 · Hero", "dark"], …],          // order = page order; scheme dark|light
 *        "formModule": "diagnostico", "form": { "formKey": "…uuid…", "surface": "fhsf-…" },
 *        "expectedDataSha": "<sha256 of the live _elementor_data>", // required unless dryRun
 *        "thumbnailId": 252002,                                     // optional: the featured image the page must keep
 *        "preserveWidgetSettings": true,                            // default true: reuse each module's live settings
 *        "protectedPages": [249582, 251279, 251981],                 // pages whose tree must stay byte-identical
 *        "dryRun": true,                                            // report only, write nothing
 *        "force": true                                              // save even when nothing differs (canary)
 *      }
 *   2. page-custom.css template (__ID__ = page id), as in <landing>-source/page-custom.css.
 *
 * Guarantees: identity + expected-hash guard; per-widget control/render preflight; no write when the rebuilt tree equals
 * the live one; rollback snapshot option (tree, settings, featured image, page_* metas) before writing; featured image
 * restored and verified after Document::save() (an API save without post_featured_image deletes it — Performance,
 * 2026-10-17); readback of widgets, unrelated pages and global chrome; Yoast indexable rebuilt over HTTPS so the
 * schema never gets plugin URLs with http:// from the CLI context; Kinsta purge.
 * Rollback: Document::save() with the snapshot's elementor_data + settings, set_post_thumbnail(snapshot thumbnail).
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 2 ) { WP_CLI::error( 'Expected: <spec.json> <page-custom.css>.' ); }

$spec = json_decode( (string) file_get_contents( $args[0] ), true );
if ( ! is_array( $spec ) ) { WP_CLI::error( 'Invalid spec JSON.' ); }
$id       = (int) ( $spec['pageId'] ?? 0 );
$landing  = (string) ( $spec['landing'] ?? '' );
$base     = (string) ( $spec['baseClass'] ?? '' );
$modules  = $spec['modules'] ?? array();
$dry      = ! empty( $spec['dryRun'] );
$preserve = ! array_key_exists( 'preserveWidgetSettings', $spec ) || ! empty( $spec['preserveWidgetSettings'] );
// Widget classes load when Elementor registers them; resolve that before checking the base class.
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
if ( ! preg_match( '/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $landing ) || ! class_exists( $base ) || ! method_exists( $base, 'render_module' ) ) { WP_CLI::error( 'Invalid landing or base class.' ); }
if ( ! is_array( $modules ) || ! $modules ) { WP_CLI::error( 'Spec has no modules.' ); }
if ( get_post_type( $id ) !== 'page' || get_post_field( 'post_name', $id ) !== (string) ( $spec['slug'] ?? '' ) || get_post_status( $id ) !== 'publish' ) { WP_CLI::error( 'Page identity drift.' ); }
if ( isset( $spec['parentId'] ) && (int) get_post_field( 'post_parent', $id ) !== (int) $spec['parentId'] ) { WP_CLI::error( 'Parent drift.' ); }

$form_key = (string) ( $spec['form']['formKey'] ?? '' );
$surface  = (string) ( $spec['form']['surface'] ?? '' );
if ( ! empty( $spec['formModule'] ) && ( ! preg_match( '/^[0-9a-f-]{36}$/', $form_key ) || ! preg_match( '/^fhsf-[a-z0-9-]+$/', $surface ) ) ) { WP_CLI::error( 'Invalid form key or surface.' ); }
$template = trim( (string) file_get_contents( $args[1] ) );
if ( false === strpos( $template, '__ID__' ) || preg_match( '/<\/?(script|style)/i', $template ) ) { WP_CLI::error( 'Unexpected custom CSS input.' ); }

$current     = (string) get_post_meta( $id, '_elementor_data', true );
$current_sha = hash( 'sha256', $current );
$expected    = (string) ( $spec['expectedDataSha'] ?? '' );
if ( ! $dry && ! preg_match( '/^[0-9a-f]{64}$/', $expected ) ) { WP_CLI::error( 'expectedDataSha is required to write.' ); }
if ( '' !== $expected && ! hash_equals( $expected, $current_sha ) ) { WP_CLI::error( 'Live tree changed since inspection (sha ' . $current_sha . ').' ); }

// Live settings per widget type, so editor changes survive a structural republish.
$live = array();
foreach ( (array) json_decode( $current, true ) as $container ) {
	foreach ( (array) ( $container['elements'] ?? array() ) as $widget ) {
		if ( isset( $widget['widgetType'] ) ) { $live[ $widget['widgetType'] ] = (array) ( $widget['settings'] ?? array() ); }
	}
}

$zero     = array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true );
$elements = array();
$kept     = array();
foreach ( $modules as $entry ) {
	list( $module, $title ) = array( (string) ( $entry[0] ?? '' ), (string) ( $entry[1] ?? '' ) );
	$scheme = 'light' === ( $entry[2] ?? 'dark' ) ? 'light' : 'dark';
	$type   = 'greenhouse_' . $landing . '_' . str_replace( '-', '_', $module );
	if ( ! isset( $widgets[ $type ] ) ) { WP_CLI::error( 'Widget absent: ' . $type ); }
	$settings = array( '_title' => $title, '_margin' => $zero, '_padding' => $zero );
	if ( $preserve && isset( $live[ $type ] ) ) { $settings = array_replace( $live[ $type ], array( '_title' => $title ) ); $kept[] = $module; }
	if ( $module === ( $spec['formModule'] ?? null ) ) { $settings = array_replace( $settings, array( 'form_key' => $form_key, 'form_surface' => $surface ) ); }
	try {
		$widgets[ $type ]->get_controls();
		$probe = $base::render_module( $module, $settings, 'preflight' );
		if ( '' === $probe || preg_match( '/%%[^%\s]+%%/', $probe ) ) { WP_CLI::error( 'Render preflight failed: ' . $module ); }
	} catch ( \Throwable $e ) {
		WP_CLI::error( 'Control preflight failed for ' . $module . ': ' . $e->getMessage() );
	}
	$elements[] = array(
		'id' => substr( md5( $landing . '-section-' . $module ), 0, 7 ), 'elType' => 'container', 'isInner' => false,
		'settings' => array(
			'_title' => $title, 'content_width' => 'full', 'flex_direction' => 'column',
			'flex_gap' => array( 'column' => '0', 'row' => '0', 'unit' => 'px', 'isLinked' => true ),
			'padding' => $zero, 'margin' => $zero,
			'css_classes' => 'gh-' . $landing . '-section clb__' . $scheme . '_section',
		),
		'elements' => array( array( 'id' => substr( md5( $landing . '-widget-' . $module ), 0, 7 ), 'elType' => 'widget', 'widgetType' => $type, 'settings' => $settings, 'elements' => array() ) ),
	);
}

$document = \Elementor\Plugin::$instance->documents->get( $id, false );
if ( ! $document ) { WP_CLI::error( 'Elementor document unavailable.' ); }
$settings_doc               = $document->get_settings();
$custom_css                 = str_replace( '__ID__', (string) $id, $template );
$same_tree                  = json_decode( $current, true ) == $elements;
$same_css                   = (string) ( $settings_doc['custom_css'] ?? '' ) === $custom_css;
$thumbnail                  = (int) get_post_thumbnail_id( $id );
$expected_thumbnail         = isset( $spec['thumbnailId'] ) ? (int) $spec['thumbnailId'] : $thumbnail;
$report                     = array( 'pageId' => $id, 'currentSha' => $current_sha, 'sameTree' => $same_tree, 'sameCss' => $same_css, 'keptWidgetSettings' => $kept, 'thumbnail' => $thumbnail, 'expectedThumbnail' => $expected_thumbnail );

if ( $dry ) {
	$report['status'] = 'dry_run';
	echo wp_json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
	return;
}
if ( $same_tree && $same_css && $thumbnail === $expected_thumbnail && empty( $spec['force'] ) ) {
	$report['status'] = 'unchanged';
	echo wp_json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
	return;
}
if ( $expected_thumbnail && get_post_type( $expected_thumbnail ) !== 'attachment' ) { WP_CLI::error( 'thumbnailId is not an attachment.' ); }

$snapshot = array( 'elementor_data' => $current, 'settings' => $settings_doc, 'thumbnail' => $thumbnail, 'metas' => array() );
foreach ( array_keys( get_post_meta( $id ) ) as $k ) {
	if ( 0 === strpos( $k, 'page_' ) || 0 === strpos( $k, '_page_' ) ) { $snapshot['metas'][ $k ] = get_post_meta( $id, $k, true ); }
}
$name = '_gh_' . str_replace( '-', '_', $landing ) . '_republish_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }

$protected = array();
foreach ( array_merge( array( (int) get_option( 'page_on_front' ) ), array_map( 'intval', (array) ( $spec['protectedPages'] ?? array() ) ) ) as $post_id ) {
	if ( $post_id && $post_id !== $id ) { $protected[ $post_id ] = hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ); }
}
$shell = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $option ) { $shell[ $option ] = get_option( $option ); }

$settings_doc['hide_title'] = 'yes';
$settings_doc['custom_css'] = $custom_css;
// Without a filled featured-image control Elementor's page settings delete the thumbnail on save.
if ( $expected_thumbnail ) { $settings_doc['post_featured_image'] = array( 'id' => $expected_thumbnail, 'url' => (string) wp_get_attachment_url( $expected_thumbnail ) ); }
if ( false === $document->save( array( 'elements' => $elements, 'settings' => $settings_doc ) ) ) { WP_CLI::error( 'Elementor save failed. Snapshot: ' . $name ); }
clean_post_cache( $id );
if ( $expected_thumbnail && (int) get_post_thumbnail_id( $id ) !== $expected_thumbnail ) { set_post_thumbnail( $id, $expected_thumbnail ); clean_post_cache( $id ); }
if ( (int) get_post_thumbnail_id( $id ) !== $expected_thumbnail ) { WP_CLI::error( 'Featured image readback failed. Snapshot: ' . $name ); }

$actual = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
if ( ! is_array( $actual ) || count( $actual ) !== count( $modules ) ) { WP_CLI::error( 'Unexpected saved document. Snapshot: ' . $name ); }
foreach ( $modules as $index => $entry ) {
	if ( ( $actual[ $index ]['elements'][0]['widgetType'] ?? '' ) !== 'greenhouse_' . $landing . '_' . str_replace( '-', '_', (string) $entry[0] ) ) { WP_CLI::error( 'Widget readback failed. Snapshot: ' . $name ); }
}
foreach ( $protected as $post_id => $hash ) { if ( ! hash_equals( $hash, hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Unrelated page changed: ' . $post_id . '. Snapshot: ' . $name ); } }
foreach ( $shell as $key => $value ) { if ( get_option( $key ) !== $value ) { WP_CLI::error( 'Global site chrome changed: ' . $key . '. Snapshot: ' . $name ); } }

// The CLI has no HTTPS context: plugins_url() would hand http:// URLs to the Yoast indexable and the schema.
$_SERVER['HTTPS'] = 'on';
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
$report += array( 'status' => 'republished_verified', 'hash' => hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) ), 'widgets' => count( $actual ), 'thumbnailAfter' => (int) get_post_thumbnail_id( $id ), 'snapshot' => $name );
echo wp_json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
