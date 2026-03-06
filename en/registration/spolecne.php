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

<label for="name">Additional info</label>
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

<label for="location">VPS location</label>
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

<label>Virtualization platform</label>
<div class="row">
	<p id="platform-vpsadminos">
		<strong>vpsAdminOS</strong> is an in-house developed container-based
		virtualization platform that powers our VPS. For more information, see our
		<a href="https://kb.vpsfree.org/manuals/vps/vpsadminos" target="_blank">knowledge base</a>
		or project documentation at
		<a href="https://vpsadminos.org" target="_blank">vpsadminos.org</a>.
	</p>
</div>

<label>Distribution</label>
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
				'czk' => '300 CZK/one month',
				'eur' => '12 EUR/one month',
			));
		?>
	</div>
<p>
	If you need an invoice, please send billing information to our <a href="/contact/">support team</a>. The data is processed according to <a href="https://github.com/vpsfreecz/oficialni-dokumenty/blob/master/organizacni_rad.md" target="_blank">organization rules</a>.
</p>
</div>

<?php
if ($f->isResubmit()) {
	$f->input('id', 'hidden');
	$f->input('token', 'hidden');
}
?>

<div class="row">
	<input class="btn btn-default" type="submit" id="send" value="Send">
</div>
