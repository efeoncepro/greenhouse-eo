<?php
/** Scoped operator-approved HubSpot runtime release. Inputs: zip, sha256/previousSha256 manifest. */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 2 ) { WP_CLI::error( 'Expected ZIP and manifest inputs.' ); }
$manifest = json_decode( file_get_contents( $args[1] ), true );
if ( ( $manifest['contract'] ?? '' ) !== 'hubspot-elementor-release.v1' ) { WP_CLI::error( 'Invalid release contract.' ); }
$zip = new ZipArchive();
if ( true !== $zip->open( $args[0] ) ) { WP_CLI::error( 'Invalid ZIP.' ); }
$root = WP_PLUGIN_DIR . '/eo-elementor-widgets/';
$files = array();
foreach ( $manifest['files'] as $entry ) {
	$path = $entry['path'];
	if ( strpos( $path, '..' ) !== false || ! preg_match( '#^(includes/(hubspot/seo\.php|hubspot/(schemas|templates)/[a-z0-9_-]+\.(json|html)|widgets/class-eo-hubspot-landing-(base|widgets)\.php|class-eo-widgets-loader\.php)|assets/(fonts/hubspot/(tabler-hubspot\.woff2|LICENSE\.txt)|css/hubspot-(landing|elementor|icons)\.css|js/hubspot-(landing|forms)\.js|img/hubspot/[a-z-]+\.svg))$#', $path ) ) { WP_CLI::error( 'Path outside release scope.' ); }
	$content = $zip->getFromName( $path );
	if ( false === $content || ! hash_equals( $entry['sha256'], hash( 'sha256', $content ) ) ) { WP_CLI::error( 'Package hash mismatch: ' . $path ); }
	$exists = file_exists( $root . $path );
	if ( $exists && ! hash_equals( $entry['previousSha256'] ?? '', hash_file( 'sha256', $root . $path ) ) ) { WP_CLI::error( 'Live drift: ' . $path ); }
	if ( ! $exists && ! empty( $entry['previousSha256'] ) ) { WP_CLI::error( 'Expected live file missing: ' . $path ); }
	$files[ $path ] = $content;
}
$backup_path = sys_get_temp_dir() . '/eo-hubspot-before-' . gmdate( 'Ymd-His' ) . '.tar';
$backup = new PharData( $backup_path );
$created = array();
foreach ( $files as $path => $content ) {
	if ( file_exists( $root . $path ) ) { $backup->addFile( $root . $path, $path ); } else { $created[] = $path; }
}
$backup->addFromString( 'release-manifest.json', wp_json_encode( $manifest ) );
$backup->addFromString( 'created-paths.json', wp_json_encode( $created ) );
// Register only after every dependency is present. No unrelated plugin files are copied.
$registry = $files['includes/widgets/class-eo-hubspot-landing-widgets.php'] ?? null;
unset( $files['includes/widgets/class-eo-hubspot-landing-widgets.php'] );
if ( null !== $registry ) { $files['includes/widgets/class-eo-hubspot-landing-widgets.php'] = $registry; }
$loader = $files['includes/class-eo-widgets-loader.php'] ?? null;
unset( $files['includes/class-eo-widgets-loader.php'] );
if ( null !== $loader ) { $files['includes/class-eo-widgets-loader.php'] = $loader; }
foreach ( $files as $path => $content ) {
	$target = $root . $path;
	if ( ! wp_mkdir_p( dirname( $target ) ) ) { WP_CLI::error( 'Cannot create scoped directory. Backup: ' . $backup_path ); }
	$temp = $target . '.hubspot-new';
	if ( false === file_put_contents( $temp, $content ) || ! rename( $temp, $target ) ) { WP_CLI::error( 'Write failed. Restore backup: ' . $backup_path ); }
	if ( function_exists( 'opcache_invalidate' ) && substr( $path, -4 ) === '.php' ) { opcache_invalidate( $target, true ); }
}
$zip->close();
// Template edits also invalidate Elementor's cached rendered elements, not only Kinsta HTML.
if ( class_exists( '\Elementor\Plugin' ) ) { \Elementor\Plugin::$instance->files_manager->clear_cache(); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'scoped_package_installed', 'backup' => $backup_path, 'files' => count( $files ), 'home' => (int) get_option( 'page_on_front' ) ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
