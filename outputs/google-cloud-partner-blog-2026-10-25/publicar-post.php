<?php
// One authorized article only. No content, taxonomy, images or banner changes.
if (!defined('ABSPATH') || !class_exists('WP_CLI')) exit;
$cfg=json_decode(file_get_contents($args[0]??''),true);
$id=252108; $sha='ada3346789d766327d60ddc535d8b312d3e3210a4fbc23ae7987ec3a630b6e56';
$manifest='efeonce-google-cloud-partner-announcement';
$snapshot='_gh_google_publish_before_252108_20261025';
$p=get_post($id);
if (!$p || $p->post_type!=='post' || $p->post_name!=='efeonce-partner-google-cloud' || (int)$p->post_author!==1 || get_post_meta($id,'_greenhouse_manifest_id',true)!==$manifest || get_post_meta($id,'_greenhouse_owned',true)!=='1' || !hash_equals($sha,hash('sha256',$p->post_content)) || !current_user_can('publish_posts')) WP_CLI::error('Identity/content/authority drift.');
$keys=array('_yoast_wpseo_meta-robots-noindex','_yoast_wpseo_meta-robots-nofollow','_greenhouse_editorial_approval');
$rebuild=function()use($id){clean_post_cache($id);if(function_exists('YoastSEO'))YoastSEO()->classes->get('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')->build_for_id_and_type($id,'post');};
$purge=function(){WP_CLI::runcommand('kinsta cache purge --all',array('return'=>true));};
$restore=function()use($id,$snapshot,$keys,$rebuild,$purge){$s=get_option($snapshot);if(!$s||$s['post']['ID']!==$id)WP_CLI::error('Missing rollback snapshot.');foreach($keys as$k){delete_post_meta($id,$k);foreach($s['meta'][$k]??array()as$v)add_post_meta($id,$k,maybe_unserialize($v));}$r=wp_update_post(wp_slash(array_intersect_key($s['post'],array_flip(array('ID','post_status','post_date','post_date_gmt','post_modified','post_modified_gmt')))),true);if(is_wp_error($r))WP_CLI::error('Rollback failed.');$rebuild();$purge();return get_post_status($id);};
if(($cfg['mode']??'')==='rollback'){echo wp_json_encode(array('status'=>$restore(),'snapshot'=>$snapshot));return;}
if($p->post_status!=='private'||get_post_meta($id,'_yoast_wpseo_meta-robots-noindex',true)!=='1'||wp_get_post_terms($id,'category',array('fields'=>'ids'))!==array(116)||wp_get_post_terms($id,'eo_format',array('fields'=>'slugs'))!==array('novedad')||(int)get_post_thumbnail_id($id)!==252106||(int)get_post_meta($id,'_yoast_wpseo_opengraph-image-id',true)!==252106||get_post_meta($id,'_eo_hero_image',true)||get_post_meta($id,'_eo_home_pin',true))WP_CLI::error('Publication contract drift.');
if(($cfg['mode']??'')!=='apply'){echo wp_json_encode(array('status'=>'ready','postId'=>$id,'contentSha256'=>$sha,'url'=>get_permalink($id),'snapshot'=>$snapshot));return;}
$terms=array();foreach(array('category','post_tag','eo_format')as$t)$terms[$t]=wp_get_post_terms($id,$t,array('fields'=>'ids'));
if(!add_option($snapshot,array('post'=>$p->to_array(),'meta'=>get_post_meta($id),'terms'=>$terms,'approvedBy'=>'Julio: Ok publica; 2026-10-25'),'',false))WP_CLI::error('Snapshot already exists; inspect before retry.');
update_post_meta($id,'_yoast_wpseo_meta-robots-noindex','2');
update_post_meta($id,'_yoast_wpseo_meta-robots-nofollow','0');
update_post_meta($id,'_greenhouse_editorial_approval','published-human-authorized-2026-10-25');
$r=wp_update_post(array('ID'=>$id,'post_status'=>'publish','post_date'=>current_time('mysql'),'post_date_gmt'=>current_time('mysql',true)),true);
if(is_wp_error($r)){$restore();WP_CLI::error('Publish failed; restored private.');}
$rebuild();$purge();
if(get_post_status($id)!=='publish'||hash('sha256',get_post_field('post_content',$id))!==$sha){$restore();WP_CLI::error('Critical readback failed; restored private.');}
echo wp_json_encode(array('status'=>'publish','postId'=>$id,'url'=>get_permalink($id),'contentSha256'=>$sha,'snapshot'=>$snapshot,'noindex'=>get_post_meta($id,'_yoast_wpseo_meta-robots-noindex',true),'bannerActive'=>false),JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
