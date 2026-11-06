<?php
// Exact private post only. Full restorable snapshot before metadata or attachment-parent changes.
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
$m=json_decode(file_get_contents($args[0] ?? ''),true);
$id=(int)($m['postId'] ?? 0); $p=get_post($id);
if (untrailingslashit(home_url())!=='https://efeoncepro.com' || !$p || $id!==252401 || $p->post_status!=='private'
    || (int)$p->post_author!==1 || $p->post_name!=='glitch-flash-images-2-6'
    || get_post_meta($id,'_greenhouse_manifest_id',true)!=='greenhouse-cf-glitch-flash-images-2-6'
    || hash('sha256',$p->post_content)!==$m['contentSha256']) { WP_CLI::error('Private post guard failed'); }
$cat=get_term(183,'category');
if (!$cat || is_wp_error($cat) || $cat->slug!=='glitch') { WP_CLI::error('Category guard failed'); }
foreach($m['attachments'] as $a){
    if (get_post_meta($a,'_gh_glitch26_manifest',true)!=='greenhouse-cf-glitch-flash-images-2-6'
        || !in_array((int)get_post($a)->post_parent,[0,$id],true)) { WP_CLI::error('Attachment ownership failed'); }
}
$keys=['_thumbnail_id','_yoast_wpseo_primary_category','_yoast_wpseo_opengraph-image','_yoast_wpseo_opengraph-image-id',
    '_yoast_wpseo_twitter-image','_yoast_wpseo_twitter-image-id','_yoast_wpseo_meta-robots-noindex','_yoast_wpseo_focuskw',
    '_yoast_wpseo_estimated-reading-time-minutes'];
$snap=['post'=>get_post($id,ARRAY_A),'categories'=>wp_get_post_categories($id),'tags'=>wp_get_post_tags($id,['fields'=>'ids']),'meta'=>[],'attachmentParents'=>[]];
foreach($keys as $k){$snap['meta'][$k]=metadata_exists('post',$id,$k)?get_post_meta($id,$k,true):null;}
foreach($m['attachments'] as $a){$snap['attachmentParents'][$a]=(int)get_post($a)->post_parent;}
$option='_gh_glitch26_private_'.$id.'_'.gmdate('Ymd_His');
if(!add_option($option,$snap,'',false)){WP_CLI::error('Snapshot failed');}
wp_set_post_categories($id,[183],false);
update_post_meta($id,'_yoast_wpseo_primary_category','183');
$cover=(int)$m['coverId']; $url=wp_get_attachment_url($cover);
if(!$url || !in_array($cover,$m['attachments'],true)){WP_CLI::error('Cover mismatch');}
set_post_thumbnail($id,$cover);
foreach(['_yoast_wpseo_opengraph-image','_yoast_wpseo_twitter-image'] as $k){update_post_meta($id,$k,$url);}
foreach(['_yoast_wpseo_opengraph-image-id','_yoast_wpseo_twitter-image-id'] as $k){update_post_meta($id,$k,(string)$cover);}
update_post_meta($id,'_yoast_wpseo_meta-robots-noindex','1');
update_post_meta($id,'_yoast_wpseo_focuskw','Images 2.6');
update_post_meta($id,'_yoast_wpseo_estimated-reading-time-minutes','17');
foreach($m['attachments'] as $a){wp_update_post(['ID'=>(int)$a,'post_parent'=>$id]);}
clean_post_cache($id);
if(function_exists('YoastSEO')){YoastSEO()->classes->get('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')->build_for_id_and_type($id,'post');}
echo wp_json_encode(['postId'=>$id,'status'=>get_post_status($id),'authorId'=>(int)get_post($id)->post_author,
    'categoryIds'=>wp_get_post_categories($id),'primaryCategory'=>get_post_meta($id,'_yoast_wpseo_primary_category',true),
    'coverId'=>get_post_thumbnail_id($id),'noindex'=>get_post_meta($id,'_yoast_wpseo_meta-robots-noindex',true),
    'contentSha256'=>hash('sha256',get_post($id)->post_content),'snapshotOption'=>$option,'permalink'=>get_permalink($id),
    'editUrl'=>admin_url('post.php?post='.$id.'&action=edit')],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE).PHP_EOL;
