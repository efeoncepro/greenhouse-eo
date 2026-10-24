<?php
/**
 * TASK-2051 — Review page for the blog home v3 on the live site: /blog-v3-revision/, noindex/nofollow, linked from
 * nowhere, canonical header and footer, same Ohio and Elementor setup the /blog/ cutover applies. /blog/ (#18456)
 * is not touched. Requested by the operator on 2026-10-24 («que quede publicado en el sitio para revisar»).
 *
 *   pnpm public-website:wpcli -- --eval-file ./scripts/public-website/blog-v3/create-blog-home-review-page.php --wp-user 12
 *
 * Idempotent: a second run updates the same page. Rollback: `wp post delete <id>` moves it to the trash (printed).
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( ! class_exists( 'EOBH_Front' ) ) { WP_CLI::error( 'eo-blog-home is not active.' ); }
if ( ! class_exists( '\Elementor\Plugin' ) ) { WP_CLI::error( 'Elementor is not active.' ); }

$slug     = 'blog-v3-revision';
$existing = get_page_by_path( $slug, OBJECT, 'page' );
$id       = $existing ? (int) $existing->ID : 0;

if ( ! $id ) {
	$id = wp_insert_post(
		array(
			'post_type'    => 'page',
			'post_status'  => 'draft',
			'post_title'   => 'Blog v3 (revisión)',
			'post_name'    => $slug,
			'post_content' => '[eo_blog_home]',
			'post_author'  => 12,
		),
		true
	);
	if ( is_wp_error( $id ) ) { WP_CLI::error( 'Page creation failed: ' . $id->get_error_message() ); }
}

// Search engines never see it; Yoast keeps it out of the sitemap because it is noindex.
$meta = array(
	'_wp_page_template'                  => 'default',
	'_yoast_wpseo_meta-robots-noindex'   => '1',
	'_yoast_wpseo_meta-robots-nofollow'  => '1',
	'page_header_add_cap'                => '0',
	'page_header_menu_style'             => 'inherit',
	'page_full_width_margins_size'       => '0px',
	'page_sidebar_position'              => 'without',
	'page_add_top_padding'               => '0',
	'page_add_wrapper'                   => '0',
	'page_breadcrumbs_visibility'        => '0',
	'page_header_visibility'             => '1',
	'page_header_title_visibility'       => '0',
	'page_dark_mode_switcher'            => '0',
	'page_social_links_visibility'       => '0',
	'page_footer_visibility'             => '1',
);
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }

$elements = array(
	array(
		'id'       => 'eobhroot',
		'elType'   => 'container',
		'settings' => array( 'content_width' => 'full_width', 'padding' => array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true ) ),
		'elements' => array(
			array( 'id' => 'eobhcode', 'elType' => 'widget', 'widgetType' => 'shortcode', 'settings' => array( 'shortcode' => '[eo_blog_home]' ), 'elements' => array() ),
		),
		'isInner'  => false,
	),
);
update_post_meta( $id, '_elementor_edit_mode', 'builder' );
update_post_meta( $id, '_elementor_template_type', 'wp-page' );
$document = \Elementor\Plugin::$instance->documents->get( $id, false );
if ( ! $document ) { WP_CLI::error( 'Elementor document not found for ' . $id ); }
$document->save( array( 'elements' => $elements, 'settings' => array( 'hide_title' => 'yes' ) ) );

wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ) );
clean_post_cache( $id );

$saved = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
if ( '[eo_blog_home]' !== ( $saved[0]['elements'][0]['settings']['shortcode'] ?? null ) ) { WP_CLI::error( 'Readback failed (Elementor body). Page ' . $id ); }
foreach ( $meta as $key => $value ) {
	if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed: ' . $key . '. Page ' . $id ); }
}

\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'blog_home_review_page_published', 'page' => $id, 'url' => get_permalink( $id ), 'rollback' => 'wp post delete ' . $id ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
