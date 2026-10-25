<?php
// Enrich only the newly created, manifest-owned private post. Publication is never performed here.
if(!defined('ABSPATH')||!class_exists('WP_CLI'))exit;
$c=json_decode(file_get_contents($args[0]??''),true);
$m=json_decode(file_get_contents($args[1]??''),true);
$draft=json_decode(file_get_contents($args[2]??''),true);
$id=252108;$p=get_post($id);
if(!$p||$p->post_status!=='private'||$p->post_type!=='post'||$p->post_author!=1||$p->post_name!==$c['slug']||get_post_meta($id,'_greenhouse_manifest_id',true)!==$c['manifestId']||get_post_meta($id,'_greenhouse_owned',true)!=='1')WP_CLI::error('Private post ownership guard failed.');
if(!hash_equals(hash('sha256',$draft['draft']['postContent']),hash('sha256',$p->post_content)))WP_CLI::error('Post content changed since its approved render.');
$cover=null;
foreach($m['assets']as$a){if(get_post_meta($a['id'],'_greenhouse_asset_manifest',true)!==$c['manifestId']||get_post_meta($a['id'],'_greenhouse_asset_sha256',true)!==$a['sourceSha256'])WP_CLI::error('Media ownership guard failed.');if($a['role']==='cover')$cover=$a;}
if(!$cover)WP_CLI::error('Missing cover.');
$snapshot='_gh_google_post_before_'.$id.'_'.gmdate('Ymd_His');
$tax=array('category','post_tag','eo_format');$terms=array();foreach($tax as$t)$terms[$t]=wp_get_post_terms($id,$t,array('fields'=>'ids'));
if(!add_option($snapshot,array('post'=>$p->to_array(),'meta'=>get_post_meta($id),'terms'=>$terms,'media'=>$m),'',false))WP_CLI::error('Snapshot failed.');
foreach(array('category'=>array(116),'post_tag'=>array(191,117),'eo_format'=>array('novedad'))as$t=>$v){$r=wp_set_object_terms($id,$v,$t,false);if(is_wp_error($r))WP_CLI::error('Term assignment failed. Snapshot: '.$snapshot);}
$meta=array(
 '_yoast_wpseo_primary_category'=>'116',
 '_yoast_wpseo_focuskw'=>$c['focusPhrase'],
 '_yoast_wpseo_canonical'=>$c['canonical'],
 '_yoast_wpseo_opengraph-title'=>$c['ogTitle'],
 '_yoast_wpseo_opengraph-description'=>$c['ogDescription'],
 '_yoast_wpseo_opengraph-image'=>$cover['url'],
 '_yoast_wpseo_opengraph-image-id'=>(string)$cover['id'],
 '_yoast_wpseo_schema_article_type'=>'NewsArticle',
 '_yoast_wpseo_meta-robots-noindex'=>'1',
 '_greenhouse_editorial_approval'=>'private-review',
);
foreach($meta as$k=>$v)update_post_meta($id,$k,wp_slash($v));
set_post_thumbnail($id,$cover['id']);
foreach($m['assets']as$a){$r=wp_update_post(array('ID'=>$a['id'],'post_parent'=>$id),true);if(is_wp_error($r))WP_CLI::error('Media parent assignment failed.');}
clean_post_cache($id);
if(function_exists('YoastSEO'))YoastSEO()->classes->get('Yoast\\WP\\SEO\\Builders\\Indexable_Builder')->build_for_id_and_type($id,'post');
$after=get_post($id);
if($after->post_status!=='private'||$after->post_content!==$p->post_content||$after->post_title!==$p->post_title||(int)get_post_thumbnail_id($id)!==$cover['id']||get_post_meta($id,'_eo_hero_image',true)||get_post_meta($id,'_eo_home_pin',true))WP_CLI::error('Final state mismatch. Snapshot: '.$snapshot);
$blocks=parse_blocks($after->post_content);
$faq=class_exists('EO_Faq')?EO_Faq::items($blocks):array();
echo wp_json_encode(array('status'=>'private-ready-for-review','postId'=>$id,'title'=>$after->post_title,'url'=>get_permalink($id),'editUrl'=>admin_url('post.php?post='.$id.'&action=edit'),'author'=>get_the_author_meta('display_name',1),'categories'=>wp_get_post_terms($id,'category',array('fields'=>'names')),'format'=>wp_get_post_terms($id,'eo_format',array('fields'=>'slugs')),'tags'=>wp_get_post_terms($id,'post_tag',array('fields'=>'names')),'featuredImage'=>(int)get_post_thumbnail_id($id),'seo'=>$meta,'faqCount'=>count($faq),'contentSha256'=>hash('sha256',$after->post_content),'snapshot'=>$snapshot,'bannerActive'=>false),JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
