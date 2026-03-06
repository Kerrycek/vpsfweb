<?php

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
	http_response_code(400);
	exit;
}

require_once __DIR__.'/../../lib/init.php';

$api = new \HaveAPI\Client(API_URL);

$f = new RegistrationForm('cs', $_POST);
$f->validate();

if (!$f->isValid()) {
	$f->printErrors();
	exit;
}

if ($f->isValidationTest()) {
	header('Location: /prihlaska/prijata/?0');
	exit;
}

$registration = new Registration('cs', $api, $f->getData());

try {
	$req = $registration->register();
	header('Location: /prihlaska/prijata/?'.$req->id);

} catch (\HaveAPI\Client\Exception\ActionFailed $e) {
	$f->printErrors($e->getResponse());
	exit;
}
