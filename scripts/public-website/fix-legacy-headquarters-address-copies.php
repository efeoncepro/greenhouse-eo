<?php
/**
 * Guarded correction (2026-10-31) of the legacy Las Bellotas address that survived the footer fix: headless
 * contact option, WooCommerce store address, inactive footer block-15 and three Elementor pages (/agendar/
 * published, its draft copy, and Landing Loop Marketing, which 301-redirects). Only the address text changes;
 * phone, hours and postcode are left as they are. One snapshot first, exact-match guards, readback after.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$options = array(
	'eoh_site_settings_contact_address' => array( "Las Bellotas 199, Of 102\nProvidencia, Santiago, Chile", "Dr. Manuel Barros Borgoño 71, oficina 1105\nProvidencia, Santiago, Chile" ),
	'woocommerce_store_address'         => array( 'Las Bellotas 199', 'Dr. Manuel Barros Borgoño 71' ),
	'woocommerce_store_address_2'       => array( 'Las Bellotas 199', 'Oficina 1105' ),
);
$block_index = 15;
$block_old   = "<!-- wp:paragraph -->\n<p><b>Efeonce Group</b><br> Las Bellotas 199,<br> OF 102<br> Providencia, Chile</p>\n<!-- /wp:paragraph -->";
$block_new   = "<!-- wp:paragraph -->\n<p><b>Efeonce Group</b><br> Dr. Manuel Barros Borgoño 71,<br> oficina 1105<br> Providencia, Chile</p>\n<!-- /wp:paragraph -->";
$pages       = array(
	243016 => array( '0271ce3dc3a67f6f6902f4f1e829024c7ad48b312a54796c984abc4a1ccd61c6', 'Las Bellotas 199, Of 102', 'Dr. Manuel Barros Borgoño 71, oficina 1105' ),
	248352 => array( 'e921f54a3ffb792458d821231e258dcfe2808cd05f93050827c5163d14dafcaa', 'Las Bellotas 199, Of 102', 'Dr. Manuel Barros Borgoño 71, oficina 1105' ),
	248840 => array( 'd4ede65982de807819801625095c6efdbc83947987d1dc1e26b65d3e83865b92', 'Las Bellotas 199, OF 102', 'Dr. Manuel Barros Borgoño 71, oficina 1105' ),
);

$replace_in_tree = function ( array $nodes, $old, $new, &$count ) use ( &$replace_in_tree ) {
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
			$node['elements'] = $replace_in_tree( $node['elements'], $old, $new, $count );
		}
	}
	return $nodes;
};

// Guards: everything must match before anything is written.
foreach ( $options as $key => $pair ) {
	if ( get_option( $key ) !== $pair[0] ) { WP_CLI::error( 'Option drift: ' . $key ); }
}
$blocks   = get_option( 'widget_block' );
$sidebars = get_option( 'sidebars_widgets' );
if ( ( $blocks[ $block_index ]['content'] ?? '' ) !== $block_old ) { WP_CLI::error( 'block-15 drift.' ); }
if ( ! in_array( 'block-' . $block_index, (array) ( $sidebars['wp_inactive_widgets'] ?? array() ), true ) ) { WP_CLI::error( 'block-15 is no longer inactive.' ); }
$plans = array();
foreach ( $pages as $id => list( $hash, $old, $new ) ) {
	if ( ! hash_equals( $hash, hash( 'sha256', get_post_meta( $id, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Elementor drift on ' . $id ); }
	$document = \Elementor\Plugin::$instance->documents->get( $id );
	$count    = 0;
	$elements = $replace_in_tree( $document->get_elements_data(), $old, $new, $count );
	if ( 1 !== $count ) { WP_CLI::error( 'Expected one occurrence on ' . $id . ', found ' . $count ); }
	$plans[ $id ] = array( $document, $elements, $old );
}
$home           = (int) get_option( 'page_on_front' );
$protected_home = hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) );

$snapshot = '_gh_legacy_address_before_' . gmdate( 'Ymd_His' );
$backup   = array( 'options' => array(), 'widget_block' => $blocks, 'pages' => array() );
foreach ( $options as $key => $pair ) { $backup['options'][ $key ] = get_option( $key ); }
foreach ( $plans as $id => $plan ) {
	$backup['pages'][ $id ] = array( 'post' => get_post( $id, ARRAY_A ), 'meta' => get_post_meta( $id ), 'elements' => $plan[0]->get_elements_data(), 'settings' => $plan[0]->get_settings() );
}
if ( ! add_option( $snapshot, $backup, '', false ) ) { WP_CLI::error( 'Backup failed.' ); }

foreach ( $options as $key => $pair ) { update_option( $key, $pair[1] ); }
$blocks[ $block_index ]['content'] = $block_new;
update_option( 'widget_block', $blocks );
foreach ( $plans as $id => list( $document, $elements ) ) {
	if ( false === $document->save( array( 'elements' => $elements, 'settings' => $document->get_settings() ) ) ) {
		WP_CLI::error( 'Elementor save failed on ' . $id . '. Snapshot: ' . $snapshot );
	}
}

// Readback.
foreach ( $options as $key => $pair ) {
	if ( get_option( $key ) !== $pair[1] ) { WP_CLI::error( 'Readback failed: ' . $key . '. Snapshot: ' . $snapshot ); }
}
if ( ( get_option( 'widget_block' )[ $block_index ]['content'] ?? '' ) !== $block_new ) { WP_CLI::error( 'Readback failed: block-15. Snapshot: ' . $snapshot ); }
if ( get_option( 'sidebars_widgets' ) !== $sidebars ) { WP_CLI::error( 'Sidebars changed unexpectedly. Snapshot: ' . $snapshot ); }
$after = array();
foreach ( $plans as $id => $plan ) {
	clean_post_cache( $id );
	global $wpdb;
	$rows = $wpdb->get_col( $wpdb->prepare( "SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id=%d AND meta_key='_elementor_data'", $id ) );
	foreach ( $rows as $row ) {
		if ( false !== strpos( $row, 'Bellotas' ) ) { WP_CLI::error( 'Old address still in ' . $id . '. Snapshot: ' . $snapshot ); }
	}
	$after[ $id ] = array( 'status' => get_post_status( $id ), 'rows' => count( $rows ), 'hash' => hash( 'sha256', $rows[0] ?? '' ) );
}
if ( ! hash_equals( $protected_home, hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Protected Home changed. Snapshot: ' . $snapshot ); }

\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'legacy_address_updated', 'snapshot' => $snapshot, 'options' => array_keys( $options ), 'block' => 'block-' . $block_index, 'pages' => $after ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
