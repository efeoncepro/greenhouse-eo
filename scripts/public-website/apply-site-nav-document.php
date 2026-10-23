<?php
/**
 * Governed apply of the site navigation document (TASK-2041/2042): saves a new revision through the plugin's own save
 * service (`wp eo-nav apply`, the same one the admin uses), which validates against site-nav.v1, refuses if someone
 * saved after the base revision, keeps every revision and purges the caches.
 * Inputs (WP-CLI eval-file only forwards files): the document JSON and a meta JSON
 * {"baseRevision": 1, "message": "Why it changed", "dryRun": true}.
 * Rollback: apply the previous revision's document (`wp eo-nav get --revision=<n>`) as a new revision.
 *
 *   pnpm public-website:wpcli -- --eval-file scripts/public-website/apply-site-nav-document.php \
 *     --input-file <document.json> --input-file <meta.json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 2 ) { WP_CLI::error( 'Expected the document and the meta JSON.' ); }
$document = json_decode( file_get_contents( $args[0] ) );
$meta     = json_decode( file_get_contents( $args[1] ), true );
if ( ! is_object( $document ) || ! is_array( $meta ) ) { WP_CLI::error( 'Unreadable document or meta.' ); }
$base    = absint( $meta['baseRevision'] ?? 0 );
$message = trim( (string) ( $meta['message'] ?? '' ) );
if ( ! $base || '' === $message ) { WP_CLI::error( 'Meta needs baseRevision and message.' ); }

// The document carries the revision it was edited from: the save service refuses if the live one moved since.
$document->revision = $base;
$file = wp_tempnam( 'eo-site-nav-apply' );
file_put_contents( $file, wp_json_encode( $document ) );
$assoc = array( 'file' => $file, 'message' => $message );
if ( ! empty( $meta['dryRun'] ) ) { $assoc['dry-run'] = true; }
WP_CLI::run_command( array( 'eo-nav', 'apply' ), $assoc );
unlink( $file );
