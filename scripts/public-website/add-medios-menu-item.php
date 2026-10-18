<?php
/**
 * Adds «Agencia de Medios» (page 251981) to the primary menu (61) under Soluciones → Crecimiento Multicanal (item 248606),
 * after the existing items (menu_order = max + 1), without touching any other item. Verifies the whole menu afterwards.
 * Rollback: wp_delete_post( <created item id>, true ) on the item printed below, purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$menu = 61; $parent = 248606; $page = 251981;
if ( ( get_nav_menu_locations()['primary'] ?? 0 ) !== $menu ) { WP_CLI::error( 'Primary menu drift.' ); }
if ( get_post_field( 'post_name', $page ) !== 'agencia-de-medios' || get_post_status( $page ) !== 'publish' ) { WP_CLI::error( 'Page drift.' ); }
$read = function () use ( $menu ) {
	$out = array();
	foreach ( wp_get_nav_menu_items( $menu, array( 'post_status' => 'any' ) ) as $it ) {
		$out[ $it->ID ] = array( $it->title, (int) $it->menu_item_parent, $it->url, (int) get_post_field( 'menu_order', $it->ID ), get_post_status( $it->ID ) );
	}
	return $out;
};
$before = $read();
if ( ! isset( $before[ $parent ] ) || 'Crecimiento Multicanal' !== $before[ $parent ][0] ) { WP_CLI::error( 'Parent item drift.' ); }
foreach ( $before as $item ) { if ( (int) $item[2] === 0 && false !== strpos( $item[2], 'agencia-de-medios' ) ) { WP_CLI::error( 'Item already exists.' ); } if ( false !== strpos( (string) $item[2], '/servicios/agencia-de-medios/' ) ) { WP_CLI::error( 'Item already exists.' ); } }
$position = max( array_map( fn( $i ) => $i[3], $before ) ) + 1;
add_option( '_gh_medios_menu_before_' . gmdate( 'Ymd_His' ), $before, '', false );
$item = wp_update_nav_menu_item( $menu, 0, array(
	'menu-item-title' => 'Agencia de Medios', 'menu-item-object' => 'page', 'menu-item-object-id' => $page, 'menu-item-type' => 'post_type',
	'menu-item-parent-id' => $parent, 'menu-item-position' => $position, 'menu-item-status' => 'publish',
) );
if ( is_wp_error( $item ) ) { WP_CLI::error( 'Menu item failed: ' . $item->get_error_message() ); }
$after = $read();
foreach ( $before as $id => $row ) { if ( ( $after[ $id ] ?? null ) !== $row ) { WP_CLI::error( 'Existing menu item changed: ' . $id . ' (new item ' . $item . ')' ); } }
if ( count( $after ) !== count( $before ) + 1 || ( $after[ $item ][1] ?? 0 ) !== $parent ) { WP_CLI::error( 'Unexpected menu after write (new item ' . $item . ')' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'menu_item_added', 'item' => $item, 'row' => $after[ $item ], 'othersUnchanged' => true ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
