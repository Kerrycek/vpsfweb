<?php

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
	http_response_code(400);
	exit;
}

require_once __DIR__.'/../../lib/init.php';

$api = new \HaveAPI\Client(API_URL);

$f = new RegistrationForm('en', $_POST);
$f->validate();

if (!$f->isValid()) {
	$f->printErrors();
	exit;
}

if ($f->isValidationTest()) {
	header('Location: /registration/accepted/?0');
	exit;
}

$registration = new Registration('en', $api, $f->getData());

try {
	$req = $registration->register();
	header('Location: /registration/accepted/?'.$req->id);

} catch (\HaveAPI\Client\Exception\ActionFailed $e) {
	$f->printErrors($e->getResponse());
	exit;
}
