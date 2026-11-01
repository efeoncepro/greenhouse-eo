<?php
/**
 * Retires /home-2-2/, an old indexable home that competed with the front page (operator request 2026-10-29: «esa home
 * antigua que compite, elimínala»). Moves the page to the trash (reversible, never a permanent delete) and creates a
 * governed Yoast Premium 301 from /home-2-2/ to the front page. Input JSON: {"dryRun": true|false}.
 * Guards: the page must be a published page with slug home-2-2 that is not the front page, not the legacy backup 2791
 * and not referenced by a menu item. Rollback: wp_untrash_post( <id> ) + publish, and delete the redirect for
 * origin «home-2-2» through WPSEO_Redirect_Manager::delete_redirects().
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$in   = json_decode( (string) file_get_contents( $args[0] ), true );
$page = get_page_by_path( 'home-2-2', OBJECT, 'page' );
if ( ! $page ) { WP_CLI::error( 'Page home-2-2 not found.' ); }
$id = (int) $page->ID;
if ( 'publish' !== $page->post_status || $id === (int) get_option( 'page_on_front' ) || 2791 === $id || 251731 === $id ) { WP_CLI::error( 'Refusing: protected or unexpected page ' . $id ); }
$menu_refs = get_posts( array( 'post_type' => 'nav_menu_item', 'numberposts' => -1, 'meta_key' => '_menu_item_object_id', 'meta_value' => (string) $id, 'fields' => 'ids' ) );
global $wpdb;
$links = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status = 'publish' AND ID <> %d AND ( post_content LIKE %s )", $id, '%home-2-2%' ) );
$meta_links = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->postmeta} pm JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE p.post_status = 'publish' AND pm.post_id <> %d AND pm.meta_key = '_elementor_data' AND pm.meta_value LIKE %s", $id, '%home-2-2%' ) );
$info = array( 'id' => $id, 'title' => $page->post_title, 'modified' => $page->post_modified_gmt, 'template' => get_post_meta( $id, '_wp_page_template', true ), 'elementor' => '' !== (string) get_post_meta( $id, '_elementor_data', true ), 'noindex' => get_post_meta( $id, '_yoast_wpseo_meta-robots-noindex', true ), 'menuRefs' => count( $menu_refs ), 'contentLinks' => $links, 'elementorLinks' => $meta_links );
if ( ! class_exists( 'WPSEO_Redirect_Manager' ) || ! class_exists( 'WPSEO_Redirect' ) ) { WP_CLI::error( 'Yoast Premium redirect API not available.' ); }
$manager = new WPSEO_Redirect_Manager();
foreach ( array( 'home-2-2', '/home-2-2', 'home-2-2/', '/home-2-2/' ) as $variant ) { if ( $manager->get_redirect( $variant ) ) { WP_CLI::error( 'Origin already redirects: ' . $variant ); } }
if ( ! empty( $in['dryRun'] ) ) { echo wp_json_encode( array( 'dryRun' => true ) + $info, JSON_UNESCAPED_UNICODE ) . PHP_EOL; return; }
if ( $info['menuRefs'] > 0 ) { WP_CLI::error( 'Page is in a menu; remove it there first.' ); }

if ( ! $manager->create_redirect( new WPSEO_Redirect( 'home-2-2', '/', 301, 'plain' ) ) ) { WP_CLI::error( 'Redirect creation failed; nothing trashed.' ); }
$stored = $manager->get_redirect( 'home-2-2' );
if ( ! ( $stored instanceof WPSEO_Redirect ) || '' !== trim( $stored->get_target(), '/' ) || 301 !== (int) $stored->get_type() ) { WP_CLI::error( 'Redirect readback mismatch; inspect Yoast redirects for home-2-2. Nothing trashed.' ); }
$trashed = wp_trash_post( $id );
if ( ! $trashed || 'trash' !== get_post_status( $id ) ) { WP_CLI::error( 'Trash failed; the redirect exists and the page is still published.' ); }
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'retired', 'redirect' => 'home-2-2 → / (301)', 'trashed' => true ) + $info, JSON_UNESCAPED_UNICODE ) . PHP_EOL;
