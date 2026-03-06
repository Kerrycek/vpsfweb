<?php
require_once dirname(__FILE__).'/../../lib/init.php';

if (!$api)
	$api = new \HaveAPI\Client(API_URL);

$templates = array();

foreach ($api->os_template->list() as $tpl) {
	if ($tpl->hypervisor_type != 'vpsadminos')
		continue;

	$templates[] = $tpl;
}

$locations = $api->location->list(array(
	'environment' => ENVIRONMENT_ID,
	'has_hypervisor' => true,
));
?>

<label for="name">Doplňující údaje</label>
<div class="row">
	<div class="col-xs-12 form-group">
		<?php $f->input('how') ?>
	</div>

</div>

<div class="row">
	<div class="col-xs-12 form-group">
		<?php $f->input('note'); ?>
	</div>

</div>

<label for="location">Umístění VPS</label>
<div class="row">
	<div class="col-xs-12 form-group">
			<?php
			$opts = array();

			foreach ($locations as $loc) {
				$opts[ $loc->id ] = 'Master Internet '.$loc->label;
			}

			$f->select('location', $opts);
		?>
	</div>

</div>

<label>Virtualizační platforma</label>
<div class="row">
	<p id="platform-vpsadminos">
		<strong>vpsAdminOS</strong> je naším spolkem vyvinutý systém pro provoz
		linuxových kontejnerů, které pohání naše VPS. Více informací viz
		<a href="https://kb.vpsfree.cz/navody/vps/vpsadminos" target="_blank">znalostní báze</a>
		nebo dokumentace projektu na
		<a href="https://vpsadminos.org" target="_blank">vpsadminos.org</a>.
	</p>
</div>

<label>Distribuce</label>
<div class="row">
	<div class="col-xs-12 form-group">
		<?php
			$opts = array();

			foreach ($templates as $tpl) {
				$opts[ $tpl->id ] = $tpl->label;
			}

			$f->select('distribution', $opts);
		?>
	</div>

</div>

<div class="row">
	<div class="col-xs-12 form-group">
		<?php
			$f->select('currency', array(
				'czk' => '300 Kč na měsíc',
				'eur' => '12 € na měsíc',
			));
		?>
	</div>
<p>
	Chceš-li fakturu, pošli po schválení přihlášky na <a href="/kontakt/">podporu</a>
	fakturační údaje. Zpracování údajů podléhá pravidlům nakládání s daty podle
	<a href="https://github.com/vpsfreecz/oficialni-dokumenty/blob/master/organizacni_rad.md" target="_blank">organizačního řádu</a>.
</p>
</div>

<?php
if ($f->isResubmit()) {
	$f->input('id', 'hidden');
	$f->input('token', 'hidden');
}
?>

<div class="row">
	<input class="btn btn-default" type="submit" id="send" value="Odeslat">
</div>
