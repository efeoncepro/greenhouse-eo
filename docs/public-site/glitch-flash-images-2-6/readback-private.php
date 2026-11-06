<?php
if (!defined('ABSPATH') || !class_exists('WP_CLI')) { exit; }
$id=252401; $p=get_post($id);
if(!$p || $p->post_status!=='private' || get_post_meta($id,'_greenhouse_manifest_id',true)!=='greenhouse-cf-glitch-flash-images-2-6'){WP_CLI::error('Unexpected post');}
$counts=[];
$walk=function($blocks) use (&$walk,&$counts){foreach($blocks as $b){if($b['blockName']){$counts[$b['blockName']]=($counts[$b['blockName']]??0)+1;}if(!empty($b['innerBlocks'])){$walk($b['innerBlocks']);}}};
$walk(parse_blocks($p->post_content));
$html=apply_filters('the_content',$p->post_content);
echo wp_json_encode(['id'=>$id,'status'=>$p->post_status,'authorId'=>(int)$p->post_author,'title'=>$p->post_title,
    'slug'=>$p->post_name,'manifest'=>get_post_meta($id,'_greenhouse_manifest_id',true),'contentSha256'=>hash('sha256',$p->post_content),
    'categories'=>wp_get_post_categories($id),'coverId'=>get_post_thumbnail_id($id),'noindex'=>get_post_meta($id,'_yoast_wpseo_meta-robots-noindex',true),
    'blocks'=>$counts,'renderedDropCount'=>substr_count($html,'gh-glitch-drop'),'renderedHtml'=>$html,
    'editUrl'=>admin_url('post.php?post='.$id.'&action=edit')],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE).PHP_EOL;
