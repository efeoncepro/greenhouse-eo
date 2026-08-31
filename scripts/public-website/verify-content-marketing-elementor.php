<?php
global $wpdb;
$id=242603;$data=json_decode(get_post_meta($id,'_elementor_data',true),true);$snap=$wpdb->get_var("SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE '_gh_content_marketing_before_%' ORDER BY option_name DESC LIMIT 1");$before=get_option($snap);$check=[];foreach($before['protected'] as $p=>$h)$check[$p]=hash_equals($h,hash('sha256',get_post_meta($p,'_elementor_data',true)));$shell=[];foreach($before['shell'] as $k=>$v)$shell[$k]=get_option($k)===$v;
$meta=[];foreach(['_yoast_wpseo_title','_yoast_wpseo_meta-robots-noindex','_yoast_wpseo_meta-robots-nofollow','_yoast_wpseo_metadesc','_eo_content_marketing_enabled','_thumbnail_id'] as $k)$meta[$k]=get_post_meta($id,$k,true);
if(in_array(false,$check,true)||in_array(false,$shell,true)||count($data)!==13)WP_CLI::error('Protected state or module count mismatch.');
echo wp_json_encode(['snapshot'=>$snap,'modules'=>count($data),'protected'=>$check,'shell'=>$shell,'meta'=>$meta,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true))],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
