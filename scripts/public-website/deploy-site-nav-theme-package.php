<?php
/**
 * Guarded scoped deployment of the global site navigation adapter in ohio-child (contract
 * eo-site-nav-theme-release.v1, TASK-2042): allowlist, package hashes, previous-SHA drift guard, backup tar,
 * functions.php written last, opcache invalidation. It never turns the menu on: the switch `eo_site_nav_enabled` is
 * created as `off` when absent and the deploy refuses if it is set to anything else.
 * Inputs: package.zip and manifest.json from build-site-nav-theme-package.cjs.
 * Rollback: restore the printed tar over wp-content/themes/ohio-child and delete the created paths it lists
 * (functions.php first, so the theme stops requiring inc/site-nav.php).
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 2 ) { WP_CLI::error( 'Expected ZIP and manifest inputs.' ); }
$manifest = json_decode( file_get_contents( $args[1] ), true );
if ( ( $manifest['contract'] ?? '' ) !== 'eo-site-nav-theme-release.v1' ) { WP_CLI::error( 'Invalid release contract.' ); }
if ( 'ohio-child' !== get_stylesheet() || 'ohio' !== get_template() ) { WP_CLI::error( 'Active theme is not ohio-child over ohio.' ); }

// The overrides fall back to Ohio's own header parts: every one of them must exist in the live parent theme.
foreach ( range( 1, 8 ) as $n ) {
	if ( ! file_exists( get_template_directory() . '/parts/headers/header-style-' . $n . '.php' ) ) { WP_CLI::error( 'Ohio header part missing: header-style-' . $n . '.php' ); }
}
$mode = get_option( 'eo_site_nav_enabled', null );
if ( null !== $mode && 'off' !== $mode ) { WP_CLI::error( 'eo_site_nav_enabled is "' . $mode . '"; this deploy only ships with the switch off.' ); }

$zip = new ZipArchive();
if ( true !== $zip->open( $args[0] ) ) { WP_CLI::error( 'Invalid ZIP.' ); }
$root    = get_stylesheet_directory() . '/';
$allowed = '#^(functions\.php|inc/site-nav\.php|parts/headers/header-style-[1-8]\.php|assets/css/site-nav-host\.css|assets/js/site-nav-host\.js|assets/vendor/axis/site-nav/\d+\.\d+\.\d+/(VERSION\.json|site-nav\.(css|js)|brand/[a-z0-9-]+\.svg))$#';
$main    = 'functions.php';
$files   = array();
foreach ( $manifest['files'] as $entry ) {
	$path = $entry['path'];
	if ( strpos( $path, '..' ) !== false || ! preg_match( $allowed, $path ) ) { WP_CLI::error( 'Path outside the site-nav theme release scope: ' . $path ); }
	$content = $zip->getFromName( $path );
	if ( false === $content || ! hash_equals( $entry['sha256'], hash( 'sha256', $content ) ) ) { WP_CLI::error( 'Package hash mismatch: ' . $path ); }
	$exists = file_exists( $root . $path );
	if ( $exists && ! hash_equals( $entry['previousSha256'] ?? '', hash_file( 'sha256', $root . $path ) ) ) { WP_CLI::error( 'Live drift: ' . $path ); }
	if ( ! $exists && ! empty( $entry['previousSha256'] ) ) { WP_CLI::error( 'Expected live file missing: ' . $path ); }
	$files[ $path ] = $content;
}
if ( ! isset( $files[ $main ], $files['inc/site-nav.php'] ) ) { WP_CLI::error( 'Package lacks functions.php or inc/site-nav.php.' ); }

$backup_path = sys_get_temp_dir() . '/ohio-child-site-nav-before-' . gmdate( 'Ymd-His' ) . '.tar';
$backup      = new PharData( $backup_path );
$created     = array();
foreach ( $files as $path => $content ) {
	if ( file_exists( $root . $path ) ) { $backup->addFile( $root . $path, $path ); } else { $created[] = $path; }
}
$backup->addFromString( 'release-manifest.json', wp_json_encode( $manifest ) );
$backup->addFromString( 'created-paths.json', wp_json_encode( $created ) );

// functions.php requires inc/site-nav.php: write it last so the theme never requires a file that is not there yet.
$files = array_diff_key( $files, array( $main => true ) ) + array( $main => $files[ $main ] );
foreach ( $files as $path => $content ) {
	$target = $root . $path;
	if ( ! wp_mkdir_p( dirname( $target ) ) ) { WP_CLI::error( 'Cannot create scoped directory. Backup: ' . $backup_path ); }
	$temp = $target . '.eosn-new';
	if ( false === file_put_contents( $temp, $content ) || ! rename( $temp, $target ) ) { WP_CLI::error( 'Write failed. Restore backup: ' . $backup_path ); }
	if ( function_exists( 'opcache_invalidate' ) && substr( $path, -4 ) === '.php' ) { opcache_invalidate( $target, true ); }
}
$zip->close();
if ( null === $mode ) { add_option( 'eo_site_nav_enabled', 'off' ); }
if ( false === get_option( 'eo_site_nav_pilot_pages', false ) ) { add_option( 'eo_site_nav_pilot_pages', array() ); }

echo wp_json_encode(
	array(
		'status'  => 'site_nav_theme_installed',
		'backup'  => $backup_path,
		'files'   => count( $files ),
		'created' => count( $created ),
		'switch'  => get_option( 'eo_site_nav_enabled' ),
		'pilot'   => get_option( 'eo_site_nav_pilot_pages' ),
		'axis'    => $manifest['axis'] ?? null,
		'runtime' => $manifest['runtimeCommit'] ?? null,
	),
	JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
) . PHP_EOL;
