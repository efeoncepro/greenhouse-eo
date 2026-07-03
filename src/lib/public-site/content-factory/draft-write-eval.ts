/**
 * Governed WordPress write payload builder for the AI Content Factory.
 *
 * Generalizes the first live write (post 250748, 2026-07-03): it produces the
 * PHP `wp eval-file` script that creates ONE private post authored by the
 * operator's WordPress user. This is the sanctioned, lowest-blast-radius write
 * path (the bridge `/v1/drafts` endpoint has writes disabled and no authorId
 * support; `production_deploy_apply` is a blocked capability). The generated PHP
 * is executed via `pnpm public-website:wpcli -- --eval-file <path> --wp-user 12`.
 *
 * This module is a PURE string builder (no side effects, no WordPress call) so it
 * is unit-testable. The actual execution + readback lives in the orchestrator CLI.
 *
 * Invariants enforced here (defense-in-depth, arch-architect 4-pillar):
 * - Safety: status is always `private`; post_author is the passed operator user,
 *   never the service user; ownership metadata is stamped.
 * - Robustness: idempotent by `_greenhouse_manifest_id` (re-run is a no-op);
 *   all es-CL text is embedded as raw UTF-8 via PHP nowdoc, NEVER \uXXXX
 *   (the encoding gotcha that broke the meta description on the first write).
 * - Resilience: emits a machine-parseable readback line for the caller.
 */

import type { ContentFactoryGeneratedDraft } from './contracts'

const NOWDOC_DELIMITER = 'GHCFWRITE'
const SAFE_MANIFEST = /^[a-z0-9][a-z0-9-]{2,80}$/
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type GovernedDraftWriteInput = {
  draft: ContentFactoryGeneratedDraft
  /** The operator's real WordPress user id (post_author). Never the service user. */
  authorId: number
  /** Stable idempotency key; also the ownership marker meta value. */
  manifestId: string
}

/** Embed a string as a PHP nowdoc (raw UTF-8, no interpolation, no escaping needed). */
const nowdoc = (value: string): string => {
  if (value.includes(NOWDOC_DELIMITER)) {
    throw new Error('content_factory_write_nowdoc_delimiter_collision')
  }

  return `<<<'${NOWDOC_DELIMITER}'\n${value}\n${NOWDOC_DELIMITER}`
}

/** Single-quoted PHP string literal for controlled, already-validated tokens. */
const phpSingleQuoted = (value: string): string => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/**
 * Build the governed `wp eval-file` PHP that creates the private, operator-authored
 * post. Validates the invariants before emitting so a malformed draft never reaches
 * WordPress.
 */
export const buildGovernedDraftWriteEval = (input: GovernedDraftWriteInput): string => {
  const { draft, authorId, manifestId } = input

  if (!Number.isInteger(authorId) || authorId <= 0) {
    throw new Error('content_factory_write_author_id_invalid')
  }

  if (!SAFE_MANIFEST.test(manifestId)) {
    throw new Error('content_factory_write_manifest_id_invalid')
  }

  if (draft.draft.kind !== 'gutenberg_post') {
    throw new Error('content_factory_write_kind_not_gutenberg')
  }

  if (!SAFE_SLUG.test(draft.slug ?? '')) {
    throw new Error('content_factory_write_slug_invalid')
  }

  if (!draft.title?.trim()) {
    throw new Error('content_factory_write_title_required')
  }

  const postContent = draft.draft.postContent

  return `<?php
// GOVERNED Content Factory write (wpcli eval-file). Creates ONE private post
// authored by user ${authorId}. Idempotent by manifest. No publish. Reversible: wp_trash_post($id).
$manifest  = ${phpSingleQuoted(manifestId)};
$author_id = ${authorId};
$slug      = ${phpSingleQuoted(draft.slug)};

$existing = get_posts( array(
  'post_type'   => 'post',
  'post_status' => 'any',
  'meta_key'    => '_greenhouse_manifest_id',
  'meta_value'  => $manifest,
  'fields'      => 'ids',
  'numberposts' => 1,
) );

if ( ! empty( $existing ) ) {
  echo "GHCF_RESULT " . wp_json_encode( array( 'outcome' => 'already_exists', 'post_id' => (int) $existing[0] ) ) . "\\n";
  return;
}

$title   = ${nowdoc(draft.title.trim())};
$excerpt = ${nowdoc(draft.excerpt ?? '')};
$content = ${nowdoc(postContent)};

$post_id = wp_insert_post( array(
  'post_type'    => 'post',
  'post_status'  => 'private',
  'post_title'   => $title,
  'post_name'    => $slug,
  'post_excerpt' => $excerpt,
  'post_content' => $content,
  'post_author'  => $author_id,
), true );

if ( is_wp_error( $post_id ) ) {
  echo "GHCF_RESULT " . wp_json_encode( array( 'outcome' => 'error', 'message' => $post_id->get_error_message() ) ) . "\\n";
  return;
}

update_post_meta( $post_id, '_greenhouse_owned', '1' );
update_post_meta( $post_id, '_greenhouse_manifest_id', $manifest );
update_post_meta( $post_id, '_greenhouse_source', 'content-factory' );
update_post_meta( $post_id, '_yoast_wpseo_title', ${nowdoc(draft.seo?.title ?? '')} );
update_post_meta( $post_id, '_yoast_wpseo_metadesc', ${nowdoc(draft.seo?.description ?? '')} );

$p = get_post( $post_id );
$blocks = array_values( array_filter( parse_blocks( $p->post_content ), function( $b ) { return ! empty( $b['blockName'] ); } ) );
echo "GHCF_RESULT " . wp_json_encode( array(
  'outcome'       => 'created',
  'post_id'       => (int) $post_id,
  'status'        => $p->post_status,
  'author_id'     => (int) $p->post_author,
  'author_name'   => get_the_author_meta( 'display_name', $p->post_author ),
  'parsed_blocks' => count( $blocks ),
  'edit_url'      => admin_url( 'post.php?post=' . $post_id . '&action=edit' ),
) ) . "\\n";
`
}

export type GovernedDraftWriteReadback = {
  outcome: 'created' | 'already_exists' | 'error'
  postId?: number
  status?: string
  authorId?: number
  authorName?: string
  parsedBlocks?: number
  editUrl?: string
  message?: string
}

/** Parse the `GHCF_RESULT <json>` line the write PHP emits. */
export const parseGovernedDraftWriteReadback = (stdout: string): GovernedDraftWriteReadback | null => {
  const line = stdout.split('\n').find(row => row.startsWith('GHCF_RESULT '))

  if (!line) return null

  let raw: Record<string, unknown>

  try {
    raw = JSON.parse(line.slice('GHCF_RESULT '.length).trim())
  } catch {
    return null
  }

  const outcome = raw.outcome === 'created' || raw.outcome === 'already_exists' || raw.outcome === 'error' ? raw.outcome : 'error'

  return {
    outcome,
    postId: typeof raw.post_id === 'number' ? raw.post_id : undefined,
    status: typeof raw.status === 'string' ? raw.status : undefined,
    authorId: typeof raw.author_id === 'number' ? raw.author_id : undefined,
    authorName: typeof raw.author_name === 'string' ? raw.author_name : undefined,
    parsedBlocks: typeof raw.parsed_blocks === 'number' ? raw.parsed_blocks : undefined,
    editUrl: typeof raw.edit_url === 'string' ? raw.edit_url : undefined,
    message: typeof raw.message === 'string' ? raw.message : undefined
  }
}
