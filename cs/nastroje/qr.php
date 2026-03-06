<?php 

require_once '../../vendor/autoload.php';
use rikudou\SkQrPayment\QrPayment;
use Rikudou\Iban\Iban\IBAN;

$output_textate = date("Ymd");
//$iban = $_GET['iban'];
$amount = $_GET['amount'];
$vs = $_GET['vs'];

if($_GET['country'] == "cz") 
{
        include 'phpqrcode/qrlib.php'; 
        $text = "SPD*1.0*ACC:CZ0420100000002200041594*AM:".$amount."*CC:CZK*X-VS:".$vs."*MSG:QRPLATBA"; 

        $ecc = 'L'; 
        $fileixel_Size = 5; 
        $frame_Size = 5; 

        QRcode::png($text, false, $ecc, $fileixel_Size, $frame_size); 
}
else if($_GET['country'] == "sk") 
{

        $iban = 'SK2083300000002601502873';//$_GET['iban'];

        $payment = new QrPayment(new IBAN($iban));
        $payment->setAmount(floatval($amount))
                        ->setComment('QR platba SK')
                        ->setCurrency('EUR')
                        ->setVariableSymbol($vs)
                        ->setPayeeName('vpsFree.cz')
                        ->setXzBinary('/run/current-system/sw/bin/xz');

        $qrCode = $payment->getQrCode();
        header('Content-Type: image/png');
        echo $qrCode->getRawString();
}
 
?>
