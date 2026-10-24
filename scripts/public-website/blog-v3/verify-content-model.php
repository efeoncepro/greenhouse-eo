<?php
/**
 * Read-only verification of the blog home content model on a WordPress site (TASK-2050, PDR-029 §7): what is
 * registered, the state of the flag, the formats of the published posts, events and resources, the scheduled purges
 * and the purge log. Writes nothing.
 *
 *   pnpm public-website:wpcli -- --eval-file scripts/public-website/blog-v3/verify-content-model.php
 *
 * @package greenhouse-eo
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$report = array(
	'at'      => gmdate( 'c' ),
	'plugin'  => defined( 'EFEONCE_EDITORIAL_BLOCKS_VERSION' ) ? EFEONCE_EDITORIAL_BLOCKS_VERSION : null,
	'model'   => defined( 'EO_CM_VERSION' ) ? EO_CM_VERSION : null,
	'flag'    => get_option( 'eo_content_model_enabled', 'missing' ),
	'types'   => array(
		'eo_format'   => taxonomy_exists( 'eo_format' ),
		'eo_event'    => post_type_exists( 'eo_event' ),
		'eo_resource' => post_type_exists( 'eo_resource' ),
	),
	'event_public' => post_type_exists( 'eo_event' ) ? (bool) get_post_type_object( 'eo_event' )->public : null,
);
if ( ! $report['types']['eo_format'] ) {
	echo wp_json_encode( $report + array( 'ok' => false, 'why' => 'content model not installed' ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
	return;
}
$terms = get_terms( array( 'taxonomy' => 'eo_format', 'hide_empty' => false ) );
$report['terms'] = is_wp_error( $terms ) ? array() : array_map( static fn( $t ) => array( $t->slug, $t->count, get_term_meta( $t->term_id, 'eo_format_icon', true ) ), $terms );
$meta = get_registered_meta_keys( 'post', 'post' );
$report['post_meta'] = array_values( array_intersect( array( '_eo_pin_until', '_eo_pinned_at', '_eo_hero_light', '_eo_hero_bold', '_eo_hero_image', '_eo_video_duration' ), array_keys( $meta ) ) );
$posts = get_posts( array( 'post_type' => 'post', 'post_status' => 'publish', 'numberposts' => -1, 'fields' => 'ids', 'suppress_filters' => true ) );
$none  = array();
$multi = array();
foreach ( $posts as $id ) {
	$f = wp_get_object_terms( (int) $id, 'eo_format', array( 'fields' => 'slugs' ) );
	$n = is_wp_error( $f ) ? 0 : count( $f );
	if ( 0 === $n ) {
		$none[] = (int) $id;
	} elseif ( $n > 1 ) {
		$multi[] = (int) $id;
	}
}
$report['posts'] = array( 'published' => count( $posts ), 'without_format' => count( $none ), 'with_several' => $multi, 'first_without' => array_slice( $none, 0, 10 ) );
$now = time();
if ( class_exists( 'EO_Event_Type' ) ) {
	$states = array();
	foreach ( get_posts( array( 'post_type' => 'eo_event', 'post_status' => 'any', 'numberposts' => 100, 'fields' => 'ids' ) ) as $id ) {
		$e        = EO_Event_Type::record( (int) $id );
		$states[] = array( 'id' => (int) $id, 'status' => get_post_status( (int) $id ), 'state' => EO_Event_Type::state( $e, $now ), 'start' => $e['start'] ? gmdate( 'c', $e['start'] ) : null, 'key_art' => (bool) $e['key_art'], 'form_key' => $e['form_key'] );
	}
	$report['events'] = $states;
}
if ( class_exists( 'EO_Resource_Registry' ) ) {
	$report['resources'] = array_map( static fn( $r ) => array( 'id' => $r['id'], 'kind' => $r['kind'], 'placements' => $r['placements'], 'reviewed_at' => $r['reviewed_at'], 'stale' => $r['stale'], 'showable' => EO_Resource_Registry::showable( $r ) ), EO_Resource_Registry::all( $now ) );
}
$cron = array();
foreach ( (array) _get_cron_array() as $ts => $hooks ) {
	foreach ( $hooks as $hook => $events ) {
		if ( 0 === strpos( $hook, 'eo_cm_' ) ) {
			foreach ( $events as $e ) {
				$cron[] = array( 'hook' => $hook, 'at' => gmdate( 'c', (int) $ts ), 'args' => $e['args'] );
			}
		}
	}
}
$report['scheduled_purges'] = $cron;
$report['purge_log']        = array_slice( (array) get_option( 'eo_cm_purge_log', array() ), -5 );
$report['cache_ver']        = (int) get_option( 'eo_cm_cache_ver', 1 );
$routes                     = rest_get_server()->get_routes();
$report['rest']             = array_values( array_filter( array_keys( $routes ), static fn( $r ) => 0 === strpos( $r, '/eo/v1/home' ) || 0 === strpos( $r, '/eo/v1/events' ) ) );
$report['ok']               = $report['types']['eo_event'] && $report['types']['eo_resource'] && count( EO_Format_Taxonomy::TERMS ) === count( $report['terms'] ) && 6 === count( $report['post_meta'] ) && ! $multi && count( $report['rest'] ) >= 5;
echo wp_json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
