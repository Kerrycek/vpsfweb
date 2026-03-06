<?php

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
	http_response_code(400);
	exit;
}

$store = "results.dat";
$lockfile = "results.lock";

$lock = fopen($lockfile, 'r+');

if (flock($lock, LOCK_EX)) {
	$f = fopen($store, 'a');

	if ($f) {
		$data = $_POST;
		$data['timestamp'] = time();
		fwrite($f, json_encode($data));
		fwrite($f, "\n");
		fclose($f);

	} else {
		echo "Well, that's just disappointing. I was THIS CLOSE to saving it, ffs.";
	};

	flock($lock, LOCK_UN);
	header('Location: /hw/ajeto.html');

} else {
    echo "I did my best bro, it just can't be saved. It cannot be done. I'm sorry.";
}
