<?php
/** Home-only SEO maintenance. Existing Yoast graph remains the sole schema owner. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
$id = 251731;
$expected = '30bab640e2dae49b9f6b13582c6dd426c018c4fda2419c0f199634cdc659605c';
if (!current_user_can('manage_options') || !current_user_can('edit_post', $id)) { WP_CLI::error('Insufficient permissions.'); }
$raw = get_post_meta($id, '_elementor_data', true);
if ((int) get_option('page_on_front') !== $id || get_post_status($id) !== 'publish'
    || get_post_meta($id, '_gh_task1358_preview_contract', true) !== 'task-1358-home-claude-preview-v1'
    || !hash_equals($expected, hash('sha256', $raw))) { WP_CLI::error('Home drift; inspect before writing.'); }
$document = \Elementor\Plugin::$instance->documents->get($id);
$settings = $document->get_settings();
$original = json_decode($raw, true);
$elements = $original;
$media = [
    '70f00f7' => ['greenhouse_agency_proof_engine', 'f002_imagen', 'greenhouse-full.svg'],
    'df965fd' => ['greenhouse_agency_comparison', 'f005_imagen', 'efeonce-white.svg'],
];
$registered = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
$changed = [];
foreach ($elements as &$container) { foreach ($container['elements'] as &$node) {
    if (!isset($media[$node['id']])) { continue; }
    [$type, $key, $filename] = $media[$node['id']];
    $url = 'http://efeoncepro.com/wp-content/plugins/eo-elementor-widgets/assets/img/agency/' . $filename;
    if (($node['widgetType'] ?? '') !== $type || !isset($registered[$type])
        || !isset($registered[$type]->get_controls()[$key])
        || ($node['settings'][$key]['url'] ?? '') !== $url) { WP_CLI::error('Media/control drift.'); }
    $node['settings'][$key]['url'] = set_url_scheme($url, 'https');
    $changed[] = $node['id'];
} }
unset($node, $container);
if (count($changed) !== 2) { WP_CLI::error('Expected exactly two media corrections.'); }
$title = 'Efeonce | Agencia de marketing digital y tecnología';
$description = 'Conectamos creatividad, medios, CRM y desarrollo web en un mismo equipo. Con Efeonce, ves tu operación y sus resultados en Greenhouse, nuestro software propio.';
$social_title = 'Marketing y tecnología, conectados | Efeonce';
$target = [
    '_yoast_wpseo_title' => $title,
    '_yoast_wpseo_metadesc' => $description,
    '_yoast_wpseo_opengraph-title' => $social_title,
    '_yoast_wpseo_opengraph-description' => $description,
    '_yoast_wpseo_twitter-title' => $social_title,
    '_yoast_wpseo_twitter-description' => $description,
];
if (get_post_meta($id, '_yoast_wpseo_title', true) !== 'Efeonce | Agencia de Marketing, CRM, contenido e IA aplicada'
    || get_post_meta($id, '_yoast_wpseo_metadesc', true) !== 'Ecosistema estratégico que integra marketing, contenido, CRM y IA aplicada. Desde LATAM, ayudamos a escalar marcas con foco y estrategia.') {
    WP_CLI::error('SEO metadata drift.');
}
foreach (array_slice(array_keys($target), 2) as $key) {
    if (metadata_exists('post', $id, $key)) { WP_CLI::error('Social override already exists; inspect before replacing.'); }
}
$protected = static function () use ($id, $target) {
    $result = ['meta' => [], 'pages' => [], 'options' => []];
    foreach (get_post_meta($id) as $key => $values) {
        if (!isset($target[$key]) && (strpos($key, '_yoast_wpseo_') === 0 || strpos($key, 'page_header') === 0
            || strpos($key, 'page_footer') === 0 || in_array($key, ['_thumbnail_id','_wp_page_template','_elementor_page_settings'], true))) {
            $result['meta'][$key] = $values;
        }
    }
    foreach ([2791,251300,251279,250816,251078,244079] as $other) {
        $result['pages'][$other] = hash('sha256', get_post_meta($other, '_elementor_data', true));
    }
    foreach (['page_on_front','show_on_front','page_for_posts','blog_public','wpseo_titles','wpseo_social','blogname','blogdescription'] as $key) {
        $result['options'][$key] = get_option($key);
    }
    return $result;
};
$before = $protected();
$before_seo = [];
foreach (array_keys($target) as $key) { $before_seo[$key] = ['exists'=>metadata_exists('post',$id,$key),'value'=>get_post_meta($id,$key,true)]; }
$snapshot = '_gh_home_seo_' . gmdate('Ymd_His');
if (!add_option($snapshot, ['contract'=>'agency-home-seo.v1','post'=>get_post($id,ARRAY_A),'elements'=>$original,'settings'=>$settings,'protected'=>$before,'seo'=>$before_seo], '', false)) {
    WP_CLI::error('Snapshot failed.');
}
$document->save(['elements'=>$elements,'settings'=>$settings]);
if (isset($before['meta']['_thumbnail_id'][0])) { update_post_meta($id, '_thumbnail_id', $before['meta']['_thumbnail_id'][0]); }
if (json_decode(get_post_meta($id, '_elementor_data', true), true) !== $elements || $before !== $protected()) {
    WP_CLI::error('Elementor/protected readback failed. Inspect snapshot ' . $snapshot);
}
foreach ($target as $key => $value) { update_post_meta($id, $key, $value); }
if (function_exists('YoastSEO') && class_exists('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')) {
    YoastSEO()->classes->get('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')->build_for_id_and_type($id, 'post');
} else { WP_CLI::error('Yoast rebuild unavailable. Metadata saved; inspect snapshot ' . $snapshot); }
\Elementor\Plugin::$instance->files_manager->clear_cache();
clean_post_cache($id);
WP_CLI::runcommand('cache flush', ['return'=>true]);
WP_CLI::runcommand('kinsta cache purge --all', ['return'=>true]);
foreach ($target as $key => $value) { if (get_post_meta($id, $key, true) !== $value) { WP_CLI::error('SEO readback failed: ' . $key); } }
if ($before !== $protected()) { WP_CLI::error('Protected state drift after SEO save.'); }
echo wp_json_encode(['status'=>'saved_verified','snapshot'=>$snapshot,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),
    'metadata'=>$target,'httpsMediaWidgets'=>$changed,'protectedUnchanged'=>true,'schema'=>'Existing Yoast WebPage/WebSite/Organization graph retained; no duplicate JSON-LD.'], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL;
