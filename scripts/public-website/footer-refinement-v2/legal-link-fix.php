<?php
$p=json_decode(file_get_contents($args[0]),true,512,JSON_THROW_ON_ERROR);
if(get_option('home')!=='https://efeoncepro.com' || !current_user_can('edit_theme_options'))throw new Exception('identity_or_permission');
$key='eo_footer_refinement_20261014_v2';$snap=get_option($key);$name='options_global_footer_copyright_right';
if(!$snap || $snap['state']!=='applied' || get_option($name)!==$snap['after'][$name])throw new Exception('legal_drift_guard');
if($p['copyrightRight']!=='<a href="/politica-de-privacidad" target="_blank" rel="noopener noreferrer">Privacidad y cookies</a>')throw new Exception('unexpected_legal_content');
update_option($name,$p['copyrightRight']);
$snap['after'][$name]=$p['copyrightRight'];$snap['legalLinkCorrection']=['at'=>gmdate('c'),'reason'=>'Inherited terms URL returns 404; published-page discovery found only privacy policy. Remove broken link without creating legal content.'];update_option($key,$snap,false);
echo wp_json_encode(['legalLinkCorrection'=>true,'readback'=>get_option($name)===$p['copyrightRight']]);
