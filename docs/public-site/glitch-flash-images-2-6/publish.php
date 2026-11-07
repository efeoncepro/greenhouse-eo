<?php
// Publish only the reviewed private Flash. Rollback restores its complete publication prestate.
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
if (untrailingslashit(home_url()) !== 'https://efeoncepro.com') { WP_CLI::error('Wrong site'); }
$m=json_decode(file_get_contents($args[0] ?? ''),true);
$id=252401; $p=get_post($id); $manifest='greenhouse-cf-glitch-flash-images-2-6';
if (!$p || $p->post_type!=='post' || $p->post_name!=='glitch-flash-images-2-6'
    || (int)$p->post_author!==1 || get_post_meta($id,'_greenhouse_manifest_id',true)!==$manifest
    || hash('sha256',$p->post_content)!==($m['contentSha256']??'')) { WP_CLI::error('Article fingerprint/ownership guard failed'); }
$mode=$m['mode']??'';
$keys=['_yoast_wpseo_meta-robots-noindex','_yoast_wpseo_meta-robots-nofollow'];
if ($mode==='publish') {
    if ($p->post_status!=='private' || (int)get_post_thumbnail_id($id)!==252389
        || wp_get_post_categories($id)!==[183] || (int)get_post_meta($id,'_yoast_wpseo_primary_category',true)!==183
        || get_post_meta($id,'_yoast_wpseo_opengraph-image-id',true)!=='252389'
        || (int)get_option('blog_public')!==1 || $p->post_title!==$m['title']) { WP_CLI::error('Publication guard failed'); }
    $canonical=get_post_meta($id,'_yoast_wpseo_canonical',true);
    if ($canonical && $canonical!=='https://efeoncepro.com/glitch/glitch-flash-images-2-6/') { WP_CLI::error('Canonical conflict'); }
    $snap=['post'=>get_post($id,ARRAY_A),'meta'=>[],'allPostMeta'=>get_post_meta($id),
        'categories'=>wp_get_post_categories($id),'tags'=>wp_get_post_tags($id,['fields'=>'ids']),
        'operatorAuthorization'=>'Ok publica','authorizedOn'=>'2026-11-05'];
    foreach($keys as $k){$snap['meta'][$k]=metadata_exists('post',$id,$k)?get_post_meta($id,$k,true):null;}
    $option='_gh_glitch26_publish_'.$id.'_'.gmdate('Ymd_His');
    if(!add_option($option,$snap,'',false)){WP_CLI::error('Publication snapshot failed');}
    delete_post_meta($id,'_yoast_wpseo_meta-robots-noindex');
    delete_post_meta($id,'_yoast_wpseo_meta-robots-nofollow');
    $r=wp_update_post(wp_slash(['ID'=>$id,'post_status'=>'publish','post_date'=>current_time('mysql'),
        'post_date_gmt'=>current_time('mysql',true),'edit_date'=>true]),true);
    if(is_wp_error($r)){
        foreach($keys as $k){if($snap['meta'][$k]===null){delete_post_meta($id,$k);}else{update_post_meta($id,$k,$snap['meta'][$k]);}}
        WP_CLI::error('Publish failed: '.$r->get_error_message());
    }
} elseif ($mode==='rollback') {
    $option=$m['snapshotOption']??'';
    if (!str_starts_with($option,'_gh_glitch26_publish_252401_')) { WP_CLI::error('Unexpected snapshot'); }
    $snap=get_option($option);
    if(!$snap || (int)$snap['post']['ID']!==$id || $snap['post']['post_status']!=='private'){WP_CLI::error('Invalid rollback snapshot');}
    $old=$snap['post'];
    $r=wp_update_post(wp_slash(['ID'=>$id,'post_status'=>'private','post_date'=>$old['post_date'],
        'post_date_gmt'=>$old['post_date_gmt'],'edit_date'=>true]),true);
    if(is_wp_error($r)){WP_CLI::error('Rollback failed');}
    foreach($keys as $k){if($snap['meta'][$k]===null){delete_post_meta($id,$k);}else{update_post_meta($id,$k,$snap['meta'][$k]);}}
} else { WP_CLI::error('Expected publish or rollback mode'); }
clean_post_cache($id);
if(function_exists('YoastSEO')){YoastSEO()->classes->get('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')->build_for_id_and_type($id,'post');}
WP_CLI::runcommand('cache flush',['return'=>true]);
$cache=WP_CLI::runcommand('kinsta cache purge --all',['return'=>true,'exit_error'=>false]);
$p=get_post($id);
echo wp_json_encode(['mode'=>$mode,'id'=>$id,'status'=>$p->post_status,'authorId'=>(int)$p->post_author,
    'title'=>$p->post_title,'date'=>$p->post_date,'dateGmt'=>$p->post_date_gmt,
    'contentSha256'=>hash('sha256',$p->post_content),'coverId'=>get_post_thumbnail_id($id),
    'robotsOverride'=>get_post_meta($id,'_yoast_wpseo_meta-robots-noindex',true),'permalink'=>get_permalink($id),
    'snapshotOption'=>$option,'cachePurgeResult'=>trim((string)$cache)],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE).PHP_EOL;
