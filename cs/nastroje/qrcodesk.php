<?php

$date = date("Ymd");
$iban = $_GET['iban'];
$amount = $_GET['amount'];
$vs = $_GET['vs'];

$d = implode("\t", array(
	0 => '',
	1 => '1',
	2 => implode("\t", array(
		true,
		$amount,						// SUMA
		'EUR',						// JEDNOTKA
		$date,					// DATUM
		$vs,					// VARIABILNY SYMBOL
		'0',						// KONSTANTNY SYMBOL
		'0',						// SPECIFICKY SYMBOL
		'',
		'QR platba SK',					// POZNAMKA
		'1',
		$iban,	// IBAN
		'FIOZSKBA',					// SWIFT
		'0',
		'0'
	))
));

$d = strrev(hash("crc32b", $d, TRUE)) . $d;
$x = proc_open("/usr/bin/xz '--format=raw' '--lzma1=lc=3,lp=0,pb=2,dict=128KiB' '-c' '-'", [0 => ["pipe", "r"], 1 => ["pipe", "w"]], $p);
fwrite($p[0], $d);
fclose($p[0]);
$o = stream_get_contents($p[1]);
fclose($p[1]);
proc_close($x);
$d = bin2hex("\x00\x00" . pack("v", strlen($d)) . $o);
$b = "";
for ($i = 0;$i < strlen($d);$i++) {
	$b .= str_pad(base_convert($d[$i], 16, 2), 4, "0", STR_PAD_LEFT);
}
$l = strlen($b);
$r = $l % 5;
if ($r > 0) {
	$p = 5 - $r;
	$b .= str_repeat("0", $p);
	$l += $p;
}
$l = $l / 5;
$d = str_repeat("_", $l);
for ($i = 0;$i < $l;$i += 1) {
	$d[$i] = "0123456789ABCDEFGHIJKLMNOPQRSTUV"[bindec(substr($b, $i * 5, 5))];
}
if (!empty($d)) {
	$u = '/chart?chs=125x124&cht=qr&chld=L|0&choe=UTF-8&chl=' . $d;
	$s = @fsockopen("chart.googleapis.com", 80, $e, $r, 1);
	if ($s) {
		$h = "GET " . $u . " HTTP/1.0\r\n";
		$h .= "Host: chart.googleapis.com\r\n";
		$h .= "Connection: close\r\n\r\n";
		fwrite($s, $h); $e = ''; $c = "";
		do {
			$e .= fgets($s, 128);
		} while (strpos($e, "\r\n\r\n") === false);
		while (!feof($s)) {
			$c .= fgets($s, 4096);
		}
		fclose($s);
	}
	header('Content-Type: image/png');
	echo $c;
}

