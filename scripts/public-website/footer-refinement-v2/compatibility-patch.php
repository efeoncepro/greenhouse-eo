<?php
/** Apply/readback/rollback for the 2026-10-18 footer selector compatibility fix. */
function eo_footer_compat_hash($value) {
    return hash('sha256', wp_json_encode($value));
}

function eo_footer_compat_assert($condition, $message) {
    if (!$condition) {
        throw new Exception($message);
    }
}

$payload = json_decode(file_get_contents($args[0]), true, 512, JSON_THROW_ON_ERROR);
$mode = $payload['mode'] ?? 'readback';
$snapshotKey = 'eo_footer_compat_20261018';
$blockId = 34;
$expectedBeforeHash = '483b232a9ddcfcc94e28087fdd791d0181032c4c14379b7e57a342e821008a29';

eo_footer_compat_assert(
    get_option('home') === $payload['home']
        && (int) get_option('page_on_front') === $payload['frontId']
        && get_stylesheet() === 'ohio-child',
    'site_identity_drift'
);
eo_footer_compat_assert(current_user_can('edit_theme_options'), 'missing_permission');
eo_footer_compat_assert(isset($payload['blocks'][(string) $blockId]), 'missing_target_block');

$blocks = get_option('widget_block');
eo_footer_compat_assert(isset($blocks[$blockId]['content']), 'live_block_missing');
$before = $blocks[$blockId]['content'];
$after = $payload['blocks'][(string) $blockId];
$snapshot = get_option($snapshotKey);

if ($mode === 'apply' && !$snapshot) {
    eo_footer_compat_assert(eo_footer_compat_hash($blocks[$blockId]) === $expectedBeforeHash, 'live_block_drift');
    eo_footer_compat_assert(substr_count($before, "document.querySelector('#colophon:has([data-eo-footer-partners=\"v2\"])')") === 1, 'legacy_selector_not_unique');
    eo_footer_compat_assert(substr_count($after, "document.querySelector('[data-eo-footer-partners=\"v2\"]')?.closest('#colophon')") === 1, 'compatible_selector_not_unique');
    eo_footer_compat_assert(
        str_replace(
            "document.querySelector('#colophon:has([data-eo-footer-partners=\"v2\"])')",
            "document.querySelector('[data-eo-footer-partners=\"v2\"]')?.closest('#colophon')",
            $before
        ) === $after,
        'unexpected_block_delta'
    );

    $snapshot = [
        'state' => 'prepared',
        'createdAt' => gmdate('c'),
        'before' => $before,
        'after' => $after,
    ];
    eo_footer_compat_assert(add_option($snapshotKey, $snapshot, '', false), 'snapshot_exists');
}

eo_footer_compat_assert(is_array($snapshot), 'snapshot_missing');

if ($mode === 'apply' && $snapshot['state'] === 'prepared') {
    eo_footer_compat_assert(eo_footer_compat_hash($blocks[$blockId]['content']) === eo_footer_compat_hash($snapshot['before']), 'concurrent_block_edit');
    $blocks[$blockId]['content'] = $snapshot['after'];
    eo_footer_compat_assert(update_option('widget_block', $blocks), 'widget_block_update_failed');
    $snapshot['state'] = 'applied';
    $snapshot['appliedAt'] = gmdate('c');
    update_option($snapshotKey, $snapshot, false);
}

if ($mode === 'rollback') {
    eo_footer_compat_assert($snapshot['state'] === 'applied', 'rollback_state_guard');
    eo_footer_compat_assert(eo_footer_compat_hash($blocks[$blockId]['content']) === eo_footer_compat_hash($snapshot['after']), 'rollback_block_drift');
    $blocks[$blockId]['content'] = $snapshot['before'];
    eo_footer_compat_assert(update_option('widget_block', $blocks), 'rollback_update_failed');
    $snapshot['state'] = 'rolled_back';
    $snapshot['rolledBackAt'] = gmdate('c');
    update_option($snapshotKey, $snapshot, false);
}

$blocks = get_option('widget_block');
$expected = $snapshot['state'] === 'rolled_back' ? $snapshot['before'] : $snapshot['after'];
$checks = [
    'block_34' => eo_footer_compat_hash($blocks[$blockId]['content']) === eo_footer_compat_hash($expected),
    'only_expected_delta' => str_replace(
        "document.querySelector('#colophon:has([data-eo-footer-partners=\"v2\"])')",
        "document.querySelector('[data-eo-footer-partners=\"v2\"]')?.closest('#colophon')",
        $snapshot['before']
    ) === $snapshot['after'],
];

echo wp_json_encode([
    'state' => $snapshot['state'],
    'snapshotOption' => $snapshotKey,
    'checks' => $checks,
    'allChecksPass' => !in_array(false, $checks, true),
    'beforeHash' => eo_footer_compat_hash($snapshot['before']),
    'afterHash' => eo_footer_compat_hash($snapshot['after']),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

eo_footer_compat_assert(!in_array(false, $checks, true), 'readback_failed');
