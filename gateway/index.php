<?php

require '../vendor/autoload.php';

// TODO - Procesar el REQUEST y retornar los datos requeridos
$data = $_REQUEST;
if($_SERVER['HTTP_HOST'] == 'erp.personal') {
	$api  = 'http://api.erp.personal/';
} else {
	$api  = 'http://erp-api.wex.uy/';
}
$url  = $api.$data['__action'].'/';

if(strtoupper($data['__method']) == 'GET') {
	$response = \Httpful\Request::get($url)
	    ->send();
}

if(strtoupper($data['__method']) == 'POST') {
	$json = array();
	foreach($data as $key => $value) {
		if($key != '__method' && $key != '__action' && $key != '_') {
			$json[$key] = $value;
		}
	}

	$response = \Httpful\Request::post($url)
	    ->sendsJson()
	    ->body(json_encode($json))
	    ->send();
}

echo $response;
?>