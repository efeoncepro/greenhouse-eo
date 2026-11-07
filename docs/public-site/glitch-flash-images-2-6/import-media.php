<?php
// Scoped, idempotent import for this article only. Does not publish or alter existing media.
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
if (untrailingslashit(home_url()) !== 'https://efeoncepro.com') { WP_CLI::error('Wrong site'); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
$config = json_decode(file_get_contents($args[0] ?? ''), true);
if (!$config || ($config['manifest'] ?? '') !== 'greenhouse-cf-glitch-flash-images-2-6') { WP_CLI::error('Wrong manifest'); }
$author = get_user_by('id', 1);
if (!$author || $author->display_name !== 'Julio Reyes') { WP_CLI::error('Author mismatch'); }
$assets = $config['assets'];
// Validate the complete input set before creating anything.
foreach ($assets as $i => $a) {
    $input = $args[$i + 1] ?? '';
    if (!is_readable($input) || hash_file('sha256', $input) !== $a['sha256']) { WP_CLI::error('Input integrity: ' . $a['id']); }
    if (!preg_match('/^[a-z0-9.-]+$/', $a['filename'])) { WP_CLI::error('Unsafe filename'); }
    if (!in_array($a['mime'], ['image/png','image/webp','image/gif','image/svg+xml'], true)) { WP_CLI::error('MIME not allowed'); }
    $existing = get_posts(['post_type'=>'attachment','post_status'=>'any','numberposts'=>2,'meta_query'=>[
        ['key'=>'_gh_glitch26_manifest','value'=>$config['manifest']],
        ['key'=>'_gh_glitch26_asset','value'=>$a['id']],
    ]]);
    if (count($existing) > 1) { WP_CLI::error('Duplicate owned asset'); }
    if ($existing && get_post_meta($existing[0]->ID, '_gh_glitch26_sha256', true) !== $a['sha256']) { WP_CLI::error('Existing asset changed'); }
}
$result = [];
foreach ($assets as $i => $a) {
    $existing = get_posts(['post_type'=>'attachment','post_status'=>'any','numberposts'=>1,'meta_query'=>[
        ['key'=>'_gh_glitch26_manifest','value'=>$config['manifest']],
        ['key'=>'_gh_glitch26_asset','value'=>$a['id']],
    ]]);
    if ($existing) { $id = $existing[0]->ID; }
    else {
        $tmp = wp_tempnam($a['filename']);
        if (!copy($args[$i + 1], $tmp)) { WP_CLI::error('Temporary copy failed'); }
        $id = media_handle_sideload(['name'=>$a['filename'],'tmp_name'=>$tmp], 0, $a['title'], [
            'post_author'=>1,'post_excerpt'=>$a['caption'],'post_content'=>'Fuente: '.$a['source'].' | '.$a['credit'],
        ]);
        if (is_wp_error($id)) { @unlink($tmp); WP_CLI::error('Import failed: '.$id->get_error_message()); }
        update_post_meta($id, '_wp_attachment_image_alt', $a['alt']);
        update_post_meta($id, '_gh_glitch26_manifest', $config['manifest']);
        update_post_meta($id, '_gh_glitch26_asset', $a['id']);
        update_post_meta($id, '_gh_glitch26_sha256', $a['sha256']);
        update_post_meta($id, '_gh_glitch26_source', $a['source']);
    }
    $meta = wp_get_attachment_metadata($id);
    $path = get_attached_file($id);
    if (get_post_mime_type($id) !== $a['mime']) { WP_CLI::error('Stored MIME mismatch'); }
    // WordPress may retain an original when it scales a large raster; record both facts.
    $result[$a['id']] = ['id'=>(int)$id,'url'=>wp_get_attachment_url($id),'mime'=>get_post_mime_type($id),
        'width'=>$meta['width'] ?? $a['width'],'height'=>$meta['height'] ?? $a['height'],
        'alt'=>get_post_meta($id,'_wp_attachment_image_alt',true),'author'=>(int)get_post($id)->post_author,
        'inputSha256'=>$a['sha256'],'storedSha256'=>is_readable($path)?hash_file('sha256',$path):null];
}
echo wp_json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
