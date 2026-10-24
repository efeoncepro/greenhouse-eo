<?php
/**
 * TASK-2046 Slice 1 — read-only inventory and rollback snapshot of every `ohio_portfolio` post.
 * Writes nothing. Prints one JSON document to stdout with, per post: ID, slug, status, dates, comment/ping status,
 * terms, every post meta value (Ohio/ACF, Elementor, Yoast) and the demo fingerprints found in content or meta.
 * Also probes the Yoast Premium redirect API (410 support) and lists existing redirects whose origin is /project/*.
 * The output is the rollback source for Slices 2 and 3: keep it off the server and versioned.
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/inventory-ohio-portfolio.php --wp-user 12 > <snapshot.json>
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$fingerprints = array(
	'envato_affiliate' => '1.envato.market',
	'ohio_demo_site'   => 'ohio.clbthemes.com',
	'colabrio_cdn'     => 'colabrio.ams3.cdn.digitaloceanspaces.com',
	'client_envato'    => 'Envato',
	'demo_cta_english' => 'Got a project?',
);

$ids = get_posts( array(
	'post_type'        => 'ohio_portfolio',
	'post_status'      => 'any',
	'posts_per_page'   => -1,
	'orderby'          => 'ID',
	'order'            => 'ASC',
	'fields'           => 'ids',
	'suppress_filters' => true,
) );

$posts = array();
foreach ( $ids as $id ) {
	$post  = get_post( $id );
	$meta  = get_post_meta( $id );
	$flat  = array();
	foreach ( $meta as $key => $values ) {
		$flat[ $key ] = count( $values ) === 1 ? $values[0] : $values;
	}
	$haystack = $post->post_content . "\n" . wp_json_encode( $flat );
	$found    = array();
	foreach ( $fingerprints as $name => $needle ) {
		$count = substr_count( $haystack, $needle );
		if ( $count > 0 ) { $found[ $name ] = $count; }
	}
	$terms = array();
	foreach ( array( 'ohio_portfolio_category', 'ohio_portfolio_tags' ) as $tax ) {
		$list = wp_get_object_terms( $id, $tax, array( 'fields' => 'slugs' ) );
		$terms[ $tax ] = is_wp_error( $list ) ? array() : $list;
	}
	$posts[] = array(
		'id'             => $id,
		'slug'           => $post->post_name,
		'title'          => $post->post_title,
		'status'         => $post->post_status,
		'date'           => $post->post_date,
		'modified'       => $post->post_modified,
		'commentStatus'  => $post->comment_status,
		'pingStatus'     => $post->ping_status,
		'commentCount'   => (int) $post->comment_count,
		'path'           => wp_make_link_relative( get_permalink( $id ) ),
		'terms'          => $terms,
		'fingerprints'   => $found,
		'contentSha256'  => hash( 'sha256', $post->post_content ),
		// Some posts carry duplicated meta rows (two `_elementor_data` values); hash the JSON of every value so the
		// fingerprint covers all of them, and count the rows so Slice 3 knows which posts need the duplicate handled.
		'elementorSha256' => isset( $flat['_elementor_data'] ) ? hash( 'sha256', is_array( $flat['_elementor_data'] ) ? wp_json_encode( $flat['_elementor_data'] ) : (string) $flat['_elementor_data'] ) : null,
		'elementorRows'  => isset( $meta['_elementor_data'] ) ? count( $meta['_elementor_data'] ) : 0,
		'duplicatedMeta' => array_keys( array_filter( $meta, function ( $values ) { return count( $values ) > 1; } ) ),
		'postContent'    => $post->post_content,
		'meta'           => $flat,
	);
}

$redirect_api = array(
	'manager' => class_exists( 'WPSEO_Redirect_Manager' ),
	'redirect' => class_exists( 'WPSEO_Redirect' ),
	'types'   => class_exists( 'WPSEO_Redirect_Types' ) ? array_keys( ( new WPSEO_Redirect_Types() )->get() ) : null,
	'version' => defined( 'WPSEO_PREMIUM_VERSION' ) ? WPSEO_PREMIUM_VERSION : null,
);

$project_redirects = array();
if ( class_exists( 'WPSEO_Redirect_Manager' ) ) {
	$manager = new WPSEO_Redirect_Manager();
	foreach ( $manager->get_all_redirects() as $redirect ) {
		$origin = $redirect->get_origin();
		if ( false !== strpos( $origin, 'project/' ) || false !== strpos( $origin, 'portfolio-category/' ) ) {
			$project_redirects[] = array( 'origin' => $origin, 'target' => $redirect->get_target(), 'type' => $redirect->get_type() );
		}
	}
}

echo wp_json_encode( array(
	'generatedAt'      => gmdate( 'c' ),
	'home'             => home_url(),
	'postType'         => 'ohio_portfolio',
	'count'            => count( $posts ),
	'byStatus'         => array_count_values( wp_list_pluck( $posts, 'status' ) ),
	'redirectApi'      => $redirect_api,
	'projectRedirects' => $project_redirects,
	'posts'            => $posts,
), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
