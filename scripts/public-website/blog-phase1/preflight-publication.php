<?php
/** Read-only production preflight. Candidate PHP runs from a temporary directory only. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) exit;
if (count($args ?? []) !== 2) WP_CLI::error('Expected candidate ZIP and Elementor proposal.');
$proposal = json_decode(file_get_contents($args[1]), true);
if (($proposal['pageId'] ?? 0) !== 18456) WP_CLI::error('Wrong page.');
$post = get_post(18456);
if (!$post || $post->post_name !== 'blog' || $post->post_status !== 'publish') WP_CLI::error('Page drift.');
$zip = new ZipArchive();
if ($zip->open($args[0]) !== true) WP_CLI::error('Invalid ZIP.');
$temporary = sys_get_temp_dir().'/eo-blog-preflight-'.wp_generate_uuid4();
$candidate_paths = ['includes/blog/model.php','includes/blog/render.php','includes/widgets/class-eo-blog-section-widget.php'];
try {
 foreach ($candidate_paths as $path) {
  $bytes = $zip->getFromName($path);
  if ($bytes === false) WP_CLI::error('Candidate missing: '.$path);
  wp_mkdir_p(dirname($temporary.'/'.$path));
  file_put_contents($temporary.'/'.$path, $bytes);
 }
 if (class_exists('EO_Blog_Section_Widget')) WP_CLI::error('Blog widget already installed; inspect outcome before retry.');
 require $temporary.'/includes/widgets/class-eo-blog-section-widget.php';
 $widget = new EO_Blog_Section_Widget();
 $controls = $widget->get_controls();
 if (!isset($controls['section'])) WP_CLI::error('Section control absent.');
 $expected = ['intro','latest','glitch','goals','resources','news','newsletter'];
 $data = eo_blog_data();
 $renders = [];
 foreach ($proposal['elements'] as $i => $container) {
  $node = $container['elements'][0] ?? [];
  if (($node['widgetType'] ?? '') !== 'greenhouse_blog_section' || ($node['settings']['section'] ?? '') !== $expected[$i]) WP_CLI::error('Unexpected tree.');
  ob_start(); eo_blog_render($expected[$i], $data); $html = ob_get_clean();
  if ($html === '' && !in_array($expected[$i], ['news','glitch'], true)) WP_CLI::error('Empty render.');
  $renders[$expected[$i]] = ['bytes'=>strlen($html),'sha256'=>hash('sha256',$html)];
 }
 if (count($proposal['elements']) !== 7) WP_CLI::error('Unexpected section count.');
 $snapshot = ['post'=>['ID'=>$post->ID,'post_title'=>$post->post_title,'post_name'=>$post->post_name,'post_status'=>$post->post_status,'post_parent'=>$post->post_parent], 'meta'=>[]];
 foreach (get_post_meta(18456) as $key=>$values) {
  if (in_array($key, ['_elementor_data','_elementor_page_settings','_elementor_controls_usage','_thumbnail_id','_wp_page_template','_elementor_edit_mode','_elementor_template_type'],true) || str_starts_with($key,'page_') || str_starts_with($key,'_yoast_wpseo_')) $snapshot['meta'][$key]=$values;
 }
 $protected = [];
 foreach (['page_on_front','page_for_posts','sidebars_widgets','widget_block','theme_mods_ohio-child','ohio_options'] as $key) $protected[$key]=hash('sha256',serialize(get_option($key)));
 foreach ([17852,20729,244079] as $id) $protected['post:'.$id]=hash('sha256',serialize([get_post($id),get_post_meta($id)]));
 echo "EO_BLOG_PREFLIGHT_START\n".wp_json_encode(['status'=>'preflight_pass','mode'=>'read_only','capturedAt'=>gmdate('c'),'expectedDataSha'=>hash('sha256',get_post_meta(18456,'_elementor_data',true)),'renders'=>$renders,'protectedHashes'=>$protected,'snapshot'=>$snapshot], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)."\nEO_BLOG_PREFLIGHT_END\n";
} finally {
 foreach ($candidate_paths as $path) if (is_file($temporary.'/'.$path)) unlink($temporary.'/'.$path);
 foreach (['includes/blog','includes/widgets','includes',''] as $dir) if (is_dir($temporary.'/'.$dir)) rmdir($temporary.'/'.$dir);
 $zip->close();
}
