<?php
/**
 * TASK-2049 Slice 1 — read-only export of the 15 real `ohio_portfolio` entries, the input of the migration to
 * `eo_project` (portfolio-entry.v1). Writes nothing. Per entry: the served value of each Ohio field (the first meta row,
 * the one ACF and the theme read when a field is duplicated), the categories, the Yoast title and description, and
 * every image it shows (gallery `project_content` plus the featured image) with its real dimensions, alt text and URL
 * from the Media Library. IDs come from the versioned allowlist; nothing is chosen by name.
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/export-ohio-real-entries.php \
 *     --input-file scripts/public-website/eo-portfolio/allowlist-2026-10-23.json --wp-user 12 > <export.json>
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input (the allowlist).' ); }
$list  = json_decode( (string) file_get_contents( $args[0] ), true );
$ids   = array();
foreach ( (array) ( $list['real'] ?? array() ) as $row ) {
	$ids[] = (int) ( is_array( $row ) ? ( $row['id'] ?? 0 ) : $row );
}
$ids = array_values( array_filter( $ids ) );
if ( 15 !== count( $ids ) ) {
	WP_CLI::error( 'La allowlist debe traer las 15 entradas reales; llegaron ' . count( $ids ) . '.' );
}

$fields = array( 'project_client', 'project_date', 'project_description', 'project_task', 'project_design', 'project_strategy', 'project_link', 'project_content', 'project_video', 'project_video_type' );

$image = function ( $id ) {
	$id   = (int) $id;
	$post = get_post( $id );
	if ( ! $post || 'attachment' !== $post->post_type ) {
		return array( 'id' => $id, 'missing' => true );
	}
	$meta = wp_get_attachment_metadata( $id );
	return array(
		'id'     => $id,
		'mime'   => get_post_mime_type( $id ),
		'width'  => is_array( $meta ) ? (int) ( $meta['width'] ?? 0 ) : 0,
		'height' => is_array( $meta ) ? (int) ( $meta['height'] ?? 0 ) : 0,
		'alt'    => (string) get_post_meta( $id, '_wp_attachment_image_alt', true ),
		'title'  => $post->post_title,
		'url'    => wp_get_attachment_url( $id ),
	);
};

$out = array();
foreach ( $ids as $id ) {
	$post = get_post( $id );
	if ( ! $post || 'ohio_portfolio' !== $post->post_type ) {
		WP_CLI::error( "La entrada $id no es un ohio_portfolio." );
	}
	$row = array(
		'id'       => $id,
		'slug'     => $post->post_name,
		'status'   => $post->post_status,
		'title'    => $post->post_title,
		'modified' => $post->post_modified,
		'path'     => wp_make_link_relative( get_permalink( $id ) ),
		'terms'    => wp_get_object_terms( $id, 'ohio_portfolio_category', array( 'fields' => 'slugs' ) ),
		'yoast'    => array(
			'title'       => (string) get_post_meta( $id, '_yoast_wpseo_title', true ),
			'description' => (string) get_post_meta( $id, '_yoast_wpseo_metadesc', true ),
		),
		'fields'   => array(),
		'images'   => array(),
	);
	foreach ( $fields as $field ) {
		$row['fields'][ $field ] = get_post_meta( $id, $field, true );
	}
	$gallery = maybe_unserialize( $row['fields']['project_content'] );
	$gallery = is_array( $gallery ) ? array_values( $gallery ) : array();
	$thumb   = (int) get_post_thumbnail_id( $id );
	$row['thumbnail'] = $thumb ? $image( $thumb ) : null;
	foreach ( $gallery as $gid ) {
		$row['images'][] = $image( $gid );
	}
	$out[] = $row;
}

WP_CLI::line( wp_json_encode( array( 'schema' => 'eo-portfolio-ohio-export.v1', 'exportedAt' => gmdate( 'c' ), 'entries' => $out ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
