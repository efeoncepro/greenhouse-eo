<?php
/**
 * Guarded correction (2026-10-31, operator: «cambia el teléfono pero deja el horario»): /agendar/ (243016) and its
 * draft copy (248352) showed the old number +56-936145176. It becomes the current Chile mobile +56 9 3732 3064.
 * Only that text changes; the office-hours line stays. Snapshot first, hash + single-occurrence guards, readback.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$old   = '+56-936145176';
$new   = '+56 9 3732 3064';
$pages = array(
	243016 => 'e7fc98910126152f693babd32bb4f7e20ef56daeb8f6d8b34fc7875bd340ef13',
	248352 => '8f4e0946ac52a2b007d4a678f6b66e343961c113cc93aec2b7ddc1307b86ff7f',
);

$replace_in_tree = function ( array $nodes, &$count ) use ( &$replace_in_tree, $old, $new ) {
	foreach ( $nodes as &$node ) {
		if ( isset( $node['settings'] ) && is_array( $node['settings'] ) ) {
			foreach ( $node['settings'] as $key => $value ) {
				if ( is_string( $value ) && false !== strpos( $value, $old ) ) {
					$count += substr_count( $value, $old );
					$node['settings'][ $key ] = str_replace( $old, $new, $value );
				}
			}
		}
		if ( ! empty( $node['elements'] ) ) {
			$node['elements'] = $replace_in_tree( $node['elements'], $count );
		}
	}
	return $nodes;
};

$plans = array();
foreach ( $pages as $id => $hash ) {
	if ( ! hash_equals( $hash, hash( 'sha256', get_post_meta( $id, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Elementor drift on ' . $id ); }
	$document = \Elementor\Plugin::$instance->documents->get( $id );
	$count    = 0;
	$elements = $replace_in_tree( $document->get_elements_data(), $count );
	if ( 1 !== $count ) { WP_CLI::error( 'Expected one occurrence on ' . $id . ', found ' . $count ); }
	$plans[ $id ] = array( $document, $elements );
}
$home           = (int) get_option( 'page_on_front' );
$protected_home = hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) );

$snapshot = '_gh_agendar_phone_before_' . gmdate( 'Ymd_His' );
$backup   = array();
foreach ( $plans as $id => $plan ) {
	$backup[ $id ] = array( 'post' => get_post( $id, ARRAY_A ), 'meta' => get_post_meta( $id ), 'elements' => $plan[0]->get_elements_data(), 'settings' => $plan[0]->get_settings() );
}
if ( ! add_option( $snapshot, $backup, '', false ) ) { WP_CLI::error( 'Backup failed.' ); }

$after = array();
foreach ( $plans as $id => list( $document, $elements ) ) {
	if ( false === $document->save( array( 'elements' => $elements, 'settings' => $document->get_settings() ) ) ) {
		WP_CLI::error( 'Elementor save failed on ' . $id . '. Snapshot: ' . $snapshot );
	}
	clean_post_cache( $id );
	$data = get_post_meta( $id, '_elementor_data', true );
	if ( false !== strpos( $data, '936145176' ) || false === strpos( $data, '3732 3064' ) || false === strpos( $data, 'Horario Laboral' ) ) {
		WP_CLI::error( 'Readback failed on ' . $id . '. Snapshot: ' . $snapshot );
	}
	$after[ $id ] = array( 'status' => get_post_status( $id ), 'hash' => hash( 'sha256', $data ) );
}
if ( ! hash_equals( $protected_home, hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Protected Home changed. Snapshot: ' . $snapshot ); }

\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'agendar_phone_updated', 'snapshot' => $snapshot, 'pages' => $after ), JSON_PRETTY_PRINT ) . PHP_EOL;
