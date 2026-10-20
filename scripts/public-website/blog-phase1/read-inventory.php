<?php
/** Read-only, public editorial data only. No post/meta/option writes. */
if (!defined('ABSPATH')) { exit; }
$terms = get_terms(['taxonomy'=>'category','hide_empty'=>true]);
$data = ['capturedAt'=>gmdate('c'),'posts'=>[],'categories'=>[]];
foreach ($terms as $t) $data['categories'][]=['id'=>$t->term_id,'name'=>$t->name,'slug'=>$t->slug,'count'=>$t->count,'url'=>get_term_link($t)];
foreach(get_posts(['post_type'=>'post','post_status'=>'publish','numberposts'=>-1,'orderby'=>['date'=>'DESC','ID'=>'DESC']]) as $p) {
 $terms=wp_get_post_categories($p->ID,['fields'=>'all']); $primary=(int)get_post_meta($p->ID,'_yoast_wpseo_primary_category',true); $label='Artículo';
 foreach($terms as $t) if($t->term_id===$primary) $label=$t->name;
 $img=get_the_post_thumbnail_url($p,'large')?:'';
 $data['posts'][]=['id'=>$p->ID,'title'=>html_entity_decode(get_the_title($p),ENT_QUOTES,'UTF-8'),'url'=>get_permalink($p),'date'=>$p->post_date,'category'=>$label,'categories'=>array_map(fn($t)=>$t->slug,$terms),'image'=>$img,'excerpt'=>wp_trim_words(wp_strip_all_tags(strip_shortcodes($p->post_excerpt?:$p->post_content)),24,'…')];
}
$data['baseline']=['pageId'=>18456,'elementorSha256'=>hash('sha256',get_post_meta(18456,'_elementor_data',true)),'pageForPosts'=>get_option('page_for_posts')];
echo "EO_BLOG_DATA_START\n".wp_json_encode($data,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE)."\nEO_BLOG_DATA_END\n";
