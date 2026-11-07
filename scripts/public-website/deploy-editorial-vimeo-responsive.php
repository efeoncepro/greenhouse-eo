<?php
/**
 * Scoped deployment of the native Vimeo responsive fix from efeonce-public-site-runtime.
 * Existing WordPress/Content Factory rail: GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.
 * Only the editorial styles PHP class can change; no plugin activation, options or other files.
 * Inputs: { mode: dry-run|apply, previousSha256, sha256 }, reviewed candidate PHP file.
 * The previous file is backed up outside the public tree. Rollback uses the same guarded apply with
 * the previous bytes and reversed hashes. A content update is separate from this runtime fix.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( 'https://efeoncepro.com' !== untrailingslashit( home_url() ) || ! current_user_can( 'manage_options' ) ) {
	WP_CLI::error( 'Unexpected site or insufficient authority.' );
}
$config = json_decode( (string) file_get_contents( $args[0] ?? '' ), true );
$new    = (string) file_get_contents( $args[1] ?? '' );
if ( ! is_array( $config ) || ! in_array( $config['mode'] ?? '', array( 'dry-run', 'apply' ), true ) || '' === $new ) {
	WP_CLI::error( 'Expected mode/hashes config and reviewed PHP input.' );
}
$plugin = 'efeonce-editorial-blocks/efeonce-editorial-blocks.php';
$target = WP_PLUGIN_DIR . '/efeonce-editorial-blocks/includes/editorial/class-eo-editorial-styles.php';
if ( ! is_plugin_active( $plugin ) || ! is_file( $target ) ) { WP_CLI::error( 'Expected active editorial plugin.' ); }
$old = (string) file_get_contents( $target );
if ( ! hash_equals( (string) ( $config['previousSha256'] ?? '' ), hash( 'sha256', $old ) ) ||
	! hash_equals( (string) ( $config['sha256'] ?? '' ), hash( 'sha256', $new ) ) ) {
	WP_CLI::error( 'Live drift or candidate hash mismatch; nothing written.' );
}
try { token_get_all( $new, TOKEN_PARSE ); } catch ( ParseError $e ) { WP_CLI::error( 'Invalid candidate PHP: ' . $e->getMessage() ); }
if ( false === strpos( $new, 'final class EO_Editorial_Styles' ) ) { WP_CLI::error( 'Wrong candidate class.' ); }
$report = array( 'mode' => $config['mode'], 'previousSha256' => hash( 'sha256', $old ), 'sha256' => hash( 'sha256', $new ) );
if ( 'apply' === $config['mode'] ) {
	$backup = tempnam( sys_get_temp_dir(), 'eo-vimeo-before-' );
	if ( false === $backup || strlen( $old ) !== file_put_contents( $backup, $old ) ) { WP_CLI::error( 'Backup failed; nothing written.' ); }
	chmod( $backup, 0600 );
	$temp = $target . '.vimeo-' . getmypid();
	if ( strlen( $new ) !== file_put_contents( $temp, $new ) ) { WP_CLI::error( 'Candidate write failed. Backup: ' . $backup ); }
	chmod( $temp, fileperms( $target ) & 0777 );
	if ( ! rename( $temp, $target ) ) { WP_CLI::error( 'Atomic replacement failed. Backup: ' . $backup ); }
	if ( function_exists( 'opcache_invalidate' ) ) { opcache_invalidate( $target, true ); }
	$report['backup'] = $backup;
	$report['readback'] = hash_equals( $config['sha256'], hash_file( 'sha256', $target ) );
	if ( ! $report['readback'] ) { WP_CLI::error( 'Readback failed. Restore backup: ' . $backup ); }
	WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true, 'exit_error' => false ) );
}
echo wp_json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
