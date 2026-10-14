<?php
if(get_option('home')!=='https://efeoncepro.com')throw new Exception('wrong_site');
WP_CLI::runcommand('cache flush');
WP_CLI::runcommand('kinsta cache purge --all');
