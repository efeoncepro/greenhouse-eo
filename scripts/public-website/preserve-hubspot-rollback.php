<?php
/** Preserve an exact pre-publication Elementor revision plus the captured original page settings/meta. */
if(!defined('ABSPATH')||!class_exists('WP_CLI'))exit;
$original=json_decode(file_get_contents($args[0]),true);$raw=get_post_meta(251801,'_elementor_data',true);
if(($original['id']??0)!==244079||!hash_equals($original['hash'],hash('sha256',$raw)))WP_CLI::error('Original revision mismatch');
$key='_gh_hubspot_rollback_20260830';
$backup=['revisionId'=>251801,'elements'=>json_decode($raw,true),'settings'=>$original['settings'],'meta'=>$original['meta'],'original'=>$original,'hash'=>$original['hash']];
if(!add_option($key,$backup,'',false)&&get_option($key)['hash']!==$original['hash'])WP_CLI::error('Backup identity conflict');
$stored=get_option($key);if(hash('sha256',wp_json_encode($stored['elements']))!==hash('sha256',wp_json_encode(json_decode($raw,true))))WP_CLI::error('Backup readback failed');
echo wp_json_encode(['backupOption'=>$key,'revisionId'=>251801,'originalHash'=>$stored['hash'],'containers'=>count($stored['elements'])]);
