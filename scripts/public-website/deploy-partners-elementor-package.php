<?php
/** Guarded scoped deployment for the Partners (/partnership/) Elementor widget package. */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 2 ) { WP_CLI::error( 'Expected ZIP and manifest inputs.' ); }
$manifest = json_decode( file_get_contents( $args[1] ), true );
if ( ( $manifest['contract'] ?? '' ) !== 'partners-elementor-release.v1' ) { WP_CLI::error( 'Invalid release contract.' ); }
$zip = new ZipArchive();
if ( true !== $zip->open( $args[0] ) ) { WP_CLI::error( 'Invalid ZIP.' ); }
$root = WP_PLUGIN_DIR . '/eo-elementor-widgets/';
$allowed = '#^(includes/(class-eo-widgets-loader\.php|widgets/class-eo-partners-landing-(base|widgets)\.php|widgets/class-eo-source-led-landing-base\.php|partners/schemas/[a-z]+(-[a-z]+)*\.json|partners/templates/[a-z0-9_-]+\.html)|assets/(css/partners-landing\.css|js/partners-landing\.js|img/partners/[a-z0-9-]+\.(webp|svg|png)))$#';
$files = array();
foreach ( $manifest['files'] as $entry ) {
	$path = $entry['path'];
	if ( strpos( $path, '..' ) !== false || ! preg_match( $allowed, $path ) ) { WP_CLI::error( 'Path outside Partners release scope.' ); }
	$content = $zip->getFromName( $path );
	if ( false === $content || ! hash_equals( $entry['sha256'], hash( 'sha256', $content ) ) ) { WP_CLI::error( 'Package hash mismatch: ' . $path ); }
	$exists = file_exists( $root . $path );
	if ( $exists && ! hash_equals( $entry['previousSha256'] ?? '', hash_file( 'sha256', $root . $path ) ) ) { WP_CLI::error( 'Live drift: ' . $path ); }
	if ( ! $exists && ! empty( $entry['previousSha256'] ) ) { WP_CLI::error( 'Expected live file missing: ' . $path ); }
	$files[ $path ] = $content;
}
$backup_path = sys_get_temp_dir() . '/eo-partners-widgets-before-' . gmdate( 'Ymd-His' ) . '.tar';
$backup = new PharData( $backup_path );
$created = array();
foreach ( $files as $path => $content ) {
	if ( file_exists( $root . $path ) ) { $backup->addFile( $root . $path, $path ); } else { $created[] = $path; }
}
$backup->addFromString( 'release-manifest.json', wp_json_encode( $manifest ) );
$backup->addFromString( 'created-paths.json', wp_json_encode( $created ) );
// The shared source-led base goes first: the landing base requires it.
$shared = 'includes/widgets/class-eo-source-led-landing-base.php';
if ( isset( $files[ $shared ] ) ) { $files = array( $shared => $files[ $shared ] ) + $files; }
$loader = $files['includes/class-eo-widgets-loader.php'] ?? null;
unset( $files['includes/class-eo-widgets-loader.php'] );
if ( null !== $loader ) { $files['includes/class-eo-widgets-loader.php'] = $loader; }
foreach ( $files as $path => $content ) {
	$target = $root . $path;
	if ( ! wp_mkdir_p( dirname( $target ) ) ) { WP_CLI::error( 'Cannot create scoped directory. Backup: ' . $backup_path ); }
	$temp = $target . '.partners-new';
	if ( false === file_put_contents( $temp, $content ) || ! rename( $temp, $target ) ) { WP_CLI::error( 'Write failed. Restore backup: ' . $backup_path ); }
	if ( function_exists( 'opcache_invalidate' ) && substr( $path, -4 ) === '.php' ) { opcache_invalidate( $target, true ); }
}
$zip->close();
if ( class_exists( '\Elementor\Plugin' ) ) { \Elementor\Plugin::$instance->files_manager->clear_cache(); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'scoped_package_installed', 'backup' => $backup_path, 'files' => count( $files ) ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
