<label for="name">Kontaktní údaje</label>
<div class="row">
	<div class="col-xs-12 form-group">
		<input type="text" name="name" placeholder="Jméno/nick" class="form-control">
	</div>
</div>

<div class="row">
	<div class="col-xs-12 form-group">
		<input type="text" name="email" placeholder="E-mail" class="form-control">
	</div>
</div>

<div class="row">
	<div class="col-xs-12 form-group">
		<input type="text" name="how" placeholder="Odkud ses o tomto projektu dozvědel(a)?" class="form-control">
	</div>
</div>

<label for="name">Které část projektu Tě nejvíc zajímá, kdyby ses měl zapojit?</label>
<div class="row">
	<div class="col-xs-12 form-group text-left">
		<div class="checkbox">
			<label>
				<input type="checkbox" name="contribEDA" value="1">
		Návrh elektroniky a prototypizace
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="contribSW" value="1">
		Software (bootloader, kernel, distribuce)
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="contribFPGA" value="1">
		Vývoj na FPGA
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="contribBuy" value="1">
		Hotový hardware připravený k použití
			</label>
		</div>
	</div>
</div>
<label for="name">Které desky tě nejvíc zajímají?</label>
<div class="row">
	<div class="col-xs-12 form-group text-left">
		<div class="checkbox">
			<label>
				<input type="checkbox" name="zajemOCPUBoard" value="1">
		CPU Board
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="zajemODevBoard" value="1">
		Development Board
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="zajemOStandaloneBoard" value="1">
		Standalone Board
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="zajemOArrayBoard" value="1">
		32x Microserver Array Board
			</label>
		</div>
	</div>
</div>
<label for="name">Co bys chtěl(a) mít na cpuboardu a standalone desce?</label>
<div class="row">
	<div class="col-xs-12 form-group text-left">
		<div class="checkbox">
			<label>
				<input type="checkbox" name="filtraceNapajeni" value="1">
        Filtraci napájení proti power analysis
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="eccMainRAM" value="1">
        ECC u systémové RAM
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="eccFPGARAM" value="1">
        ECC u FPGA RAM
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="mgmtCPUBoard" value="1">
        Remote management přímo na cpuboardu
			</label>
		</div>
	</div>
</div>

<label>Co bys chtěl(a) mít v sw stacku?</label>
<div class="row">
	<div class="col-xs-12 form-group text-left">
		<div class="checkbox">
			<label>
				<input type="checkbox" name="swUEFI" value="1">
        Podporu UEFI prostředí
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="swDefault" value="1">
        NixOS / vpsAdminOS
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="swDebian" value="1">
        Debian
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="swUbuntu" value="1">
        Ubuntu
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input type="checkbox" name="swFedora" value="1">
        Fedora
			</label>
		</div>
	</div>
</div>

<label>Prostor pro další feedback, nápady, připomínky:</label>
<div class="row">
	<div class="col-xs-12 form-group">
		<textarea class="form-control" rows="8" name="extraComments" placeholder="Neboj se rozepsat ;)"></textarea>
	</div>
</div>

<div class="row">
	<input class="btn btn-default" type="submit" id="send" value="Odeslat">
</div>
