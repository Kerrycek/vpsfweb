<?php

class Registration {
	private $lang;
	private $db;
	private $data;

	public function __construct($lang, $api, $data) {
		$this->lang = $lang;
		$this->api = $api;
		$this->data = $data;
		$this->ip = null;
	}

	public function register() {
		$params = array(
			'login' => $this->data['login'],
			'full_name' => $this->data['name'],
			'email' => $this->data['email'],
			'address' => $this->data['address'].', '.$this->data['zip'].' '.$this->data['city'].', '.$this->data['country'],
			'year_of_birth' => $this->data['birth'],
			'how' => $this->data['how'],
			'note' => $this->data['note'],
			'os_template' => $this->data['distribution'],
			'location' => $this->data['location'],
			'currency' => $this->data['currency'],
			'language' => $this->getLanguageId($this->lang),
		);

		if ($this->data['entity_type'] == 'pravnicka') {
			$params['org_name'] = $this->data['org_name'];
			$params['org_id'] = $this->data['ic'];
		}

		if ($this->data['id']) {
			return $this->api->user_request->registration->update(
				$this->data['id'], $this->data['token'], $params
			);
		}

		return $this->api->user_request->registration->create($params);
	}

	private function getLanguageId($code) {
		foreach ($this->api->language->list() as $lang) {
			if ($lang->code == $code)
				return $lang->id;
		}

		return 0;
	}
}
