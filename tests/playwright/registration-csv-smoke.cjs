const { execSync } = require('node:child_process');
const fs = require('node:fs');
const { request } = require('playwright');

const BASE_URL = process.env.REGISTRATION_BASE_URL || 'http://web.crucio.cz';
const OUT = process.env.OUT || 'test-artifacts/registration-antispam-200-attempts.csv';
const COUNT = Number(process.env.COUNT || 200);
const RATE_LIMIT_CLEAR_COMMAND = process.env.REGISTRATION_RATE_LIMIT_CLEAR_COMMAND || '';
const REMOTE_ADDR = process.env.REGISTRATION_TEST_REMOTE_ADDR || 'server-observed';
const TRUSTED_PROXY_MODE = process.env.REGISTRATION_TRUSTED_PROXY_MODE || 'untrusted';
const RATE_LIMIT_DIR = process.env.REGISTRATION_ANTISPAM_DIR || '/tmp/vpsfweb-antispam-playwright';

const FORMS = [
	{
		lang: 'cs',
		formPath: '/prihlaska/fyzicka-osoba/form.php',
		sendPath: '/prihlaska/send.php',
		accepted: /Přihláška přijata/i,
		invalidForm: /platnost formuláře nelze ověřit/i,
		tooSoon: /příliš rychle/i,
		honeypot: /nepodařilo uložit/i,
		rateLimit: /příliš mnoho pokusů/i,
	},
	{
		lang: 'en',
		formPath: '/registration/fyzicka-osoba/form.php',
		sendPath: '/registration/send.php',
		accepted: /Registration form was saved/i,
		invalidForm: /form validity cannot be verified/i,
		tooSoon: /submitted too quickly/i,
		honeypot: /cannot save your registration/i,
		rateLimit: /too many attempts/i,
	},
];

const POSTAL_POSITIVE_CASES = [
	{ scenario: 'valid_cz_12345', country: 'Czech Republic', zip: '12345', address: 'Krakovska 583/9', city: 'Praha' },
	{ scenario: 'valid_cz_123_45', country: 'Czechia', zip: '123 45', address: 'Krakovska 583/9', city: 'Praha' },
	{ scenario: 'valid_sk_12345', country: 'Slovakia', zip: '12345', address: 'Namestie SNP 12', city: 'Bratislava' },
	{ scenario: 'valid_sk_123_45', country: 'Slovensko', zip: '123 45', address: 'Namestie SNP 12', city: 'Bratislava' },
	{ scenario: 'valid_uk_london', country: 'United Kingdom', zip: 'NW1 6XE', address: '221B Baker Street', city: 'London' },
	{ scenario: 'valid_jp_tokyo', country: 'Japan', zip: '131-0045', address: '1 Chome-1-2 Oshiage', city: 'Tokyo' },
	{ scenario: 'valid_br_sao_paulo', country: 'Brazil', zip: '01310-200', address: 'Avenida Paulista 1578', city: 'Sao Paulo' },
	{ scenario: 'valid_au_sydney', country: 'Australia', zip: '2000', address: '1 Macquarie Street', city: 'Sydney' },
	{ scenario: 'valid_sg_singapore', country: 'Singapore', zip: '018956', address: '10 Bayfront Avenue', city: 'Singapore' },
	{ scenario: 'valid_ug_kampala_na', country: 'Uganda', zip: 'N/A', address: 'Plot 2 Kampala Road', city: 'Kampala' },
];

const NEGATIVE_CASES = [
	{ scenario: 'short_login', expected: 'invalid_fields', set: { login: 'ab' } },
	{ scenario: 'repeated_login', expected: 'invalid_fields', set: { login: 'aaaaa' } },
	{ scenario: 'short_name', expected: 'invalid_fields', set: { name: 'Ana' } },
	{ scenario: 'single_word_name', expected: 'invalid_fields', set: { name: 'Madonna' } },
	{ scenario: 'name_with_number', expected: 'invalid_fields', set: { name: 'John 123' } },
	{ scenario: 'bad_email', expected: 'invalid_fields', set: { email: 'not-an-email' } },
	{ scenario: 'birth_too_young', expected: 'invalid_fields', set: { birth: String(new Date().getFullYear() - 4) } },
	{ scenario: 'address_too_short', expected: 'invalid_fields', set: { address: 'hhhh' } },
	{ scenario: 'cz_bad_zip_letters', expected: 'invalid_fields', set: { country: 'Czech Republic', zip: 'ABCDE' } },
	{ scenario: 'sk_bad_zip_letters', expected: 'invalid_fields', set: { country: 'Slovakia', zip: 'ABCDE' } },
	{ scenario: 'unknown_zip_punctuation', expected: 'invalid_fields', set: { country: 'Atlantis', zip: '------', address: 'Ocean 123', city: 'Poseidon' } },
	{ scenario: 'unknown_zip_too_long', expected: 'invalid_fields', set: { country: 'Atlantis', zip: '12345678901234567890', address: 'Ocean 123', city: 'Poseidon' } },
	{ scenario: 'unknown_zip_script', expected: 'invalid_fields', set: { country: 'Atlantis', zip: '<script>alert(1)</script>', address: 'Ocean 123', city: 'Poseidon' } },
	{ scenario: 'uganda_calling_code_as_zip', expected: 'invalid_fields', set: { country: 'Uganda', zip: '256', address: 'Plot 2 Kampala Road', city: 'Kampala' } },
	{ scenario: 'honeypot_filled', expected: 'honeypot', set: { website: 'https://spam.example' } },
	{ scenario: 'missing_token', expected: 'invalid_form', omit: ['form_token'] },
	{ scenario: 'forged_token', expected: 'invalid_form', set: { form_token: 'bad-token' } },
];

const HEADERS = [
	'attempt_no',
	'scenario',
	'lang',
	'country',
	'zip',
	'token_mode',
	'expected_result',
	'actual_result',
	'passed',
	'error_text',
	'remote_addr',
	'x_forwarded_for',
	'trusted_proxy_mode',
	'rate_limit_dir',
	'http_status',
	'entity_type',
	'login',
	'name',
	'email',
	'birth',
	'address',
	'city',
	'how',
	'note',
	'distribution',
	'location',
	'currency',
	'website',
	'form_started_at',
	'form_token',
	'full_address',
];

function csvCell(value) {
	const s = String(value || '');
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function decodeHtml(value) {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
}

function inputValue(html, name) {
	const input = html.match(new RegExp(`<input[^>]+name=["']${name}["'][^>]*>`, 'i'))?.[0] || '';
	return decodeHtml(input.match(/value=["']([^"']*)["']/i)?.[1] || '');
}

function firstSelectValue(html, name) {
	const select = html.match(new RegExp(`<select[^>]+name=["']${name}["'][^>]*>([\\s\\S]*?)<\\/select>`, 'i'))?.[1] || '';
	return decodeHtml(select.match(/<option(?![^>]*disabled)[^>]*value=["']([^"']+)["'][^>]*>/i)?.[1] || '');
}

function uniqueLogin(i) {
	return `csv${Date.now().toString(36)}${i.toString(36)}`.slice(0, 30);
}

function uniqueEmail(i) {
	return `csv-antispam-${Date.now()}-${i}@example.invalid`;
}

function clearRateLimit() {
	if (RATE_LIMIT_CLEAR_COMMAND) {
		execSync(RATE_LIMIT_CLEAR_COMMAND, { stdio: 'ignore' });
	}
}

async function loadState(api, form) {
	const response = await api.get(form.formPath);

	if (!response.ok())
		throw new Error(`Cannot load ${form.formPath}: ${response.status()}`);

	const html = await response.text();

	return {
		startedAt: inputValue(html, 'form_started_at'),
		token: inputValue(html, 'form_token'),
		distribution: firstSelectValue(html, 'distribution'),
		location: firstSelectValue(html, 'location'),
		currency: firstSelectValue(html, 'currency'),
	};
}

function validData(state, i, overrides = {}) {
	const data = new URLSearchParams({
		_mock: '1',
		entity_type: 'fyzicka',
		login: uniqueLogin(i),
		name: 'Csv Tester',
		email: uniqueEmail(i),
		birth: String(1980 + (i % 25)),
		address: 'Krakovska 583/9',
		city: 'Praha',
		zip: '12345',
		country: 'Czech Republic',
		how: 'CSV Playwright smoke',
		note: `generated attempt ${i}`,
		distribution: state.distribution,
		location: state.location,
		currency: state.currency,
		website: '',
		form_started_at: state.startedAt,
		form_token: state.token,
	});

	for (const [key, value] of Object.entries(overrides)) {
		data.set(key, value);
	}

	return data;
}

function classify(html, form) {
	const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

	if (form.accepted.test(html))
		return { result: 'accepted', errorText: '' };

	if (form.invalidForm.test(html))
		return { result: 'invalid_form', errorText: pickErrors(text) };

	if (form.tooSoon.test(html))
		return { result: 'too_soon', errorText: pickErrors(text) };

	if (form.honeypot.test(html))
		return { result: 'honeypot', errorText: pickErrors(text) };

	if (form.rateLimit.test(html))
		return { result: 'rate_limited', errorText: pickErrors(text) };

	if (/alert-danger|class="[^"]*error/.test(html))
		return { result: 'invalid_fields', errorText: pickErrors(text) };

	return { result: 'unknown', errorText: text.slice(0, 500) };
}

function pickErrors(text) {
	const labels = [
		'Login:',
		'Celé jméno:',
		'Name:',
		'E-mail:',
		'Rok narození:',
		'Year of birth:',
		'Adresa:',
		'Address:',
		'PSČ:',
		'ZIP/Postal code:',
		'Stát:',
		'State:',
		'Přihláška:',
		'Registration:',
	];
	const found = [];

	for (const label of labels) {
		const idx = text.indexOf(label);

		if (idx !== -1)
			found.push(text.slice(idx, idx + 180));
	}

	return found.join(' | ').slice(0, 900);
}

function makePlan(count) {
	const plan = [];

	for (const form of FORMS) {
		for (const postalCase of POSTAL_POSITIVE_CASES) {
			plan.push({ form, scenario: postalCase.scenario, expected: 'accepted', overrides: postalCase, tokenMode: 'real_waited' });
		}

		for (const negativeCase of NEGATIVE_CASES) {
			plan.push({ form, scenario: negativeCase.scenario, expected: negativeCase.expected, overrides: negativeCase.set || {}, omit: negativeCase.omit || [], tokenMode: 'real_waited' });
		}

		plan.push({ form, scenario: 'too_fast_valid_token', expected: 'too_soon', overrides: {}, tokenMode: 'real_fresh' });
		plan.push({ form, scenario: 'mock_without_token', expected: 'invalid_form', overrides: {}, omit: ['form_started_at', 'form_token'], tokenMode: 'missing' });
		plan.push({ form, scenario: 'rate_limit_xff_spoof_1', expected: 'accepted', overrides: {}, tokenMode: 'real_waited', xForwardedFor: '198.51.100.1', rateSequence: true });
		plan.push({ form, scenario: 'rate_limit_xff_spoof_2', expected: 'accepted', overrides: {}, tokenMode: 'real_waited', xForwardedFor: '198.51.100.2', rateSequence: true });
		plan.push({ form, scenario: 'rate_limit_xff_spoof_3', expected: 'accepted', overrides: {}, tokenMode: 'real_waited', xForwardedFor: '198.51.100.3', rateSequence: true });
		plan.push({ form, scenario: 'rate_limit_xff_spoof_4', expected: 'rate_limited', overrides: {}, tokenMode: 'real_waited', xForwardedFor: '198.51.100.4', rateSequence: true });
	}

	for (let i = 0; plan.length < count; i++) {
		const form = FORMS[i % FORMS.length];
		const postalCase = POSTAL_POSITIVE_CASES[i % POSTAL_POSITIVE_CASES.length];
		const negativeCase = NEGATIVE_CASES[i % NEGATIVE_CASES.length];

		if (i % 3 === 0)
			plan.push({ form, scenario: postalCase.scenario, expected: 'accepted', overrides: postalCase, tokenMode: 'real_waited' });
		else
			plan.push({ form, scenario: negativeCase.scenario, expected: negativeCase.expected, overrides: negativeCase.set || {}, omit: negativeCase.omit || [], tokenMode: 'real_waited' });
	}

	return plan.slice(0, count);
}

(async () => {
	const api = await request.newContext({ baseURL: BASE_URL, maxRedirects: 5 });
	const states = new Map();

	for (const form of FORMS) {
		states.set(form.lang, await loadState(api, form));
	}

	await new Promise((resolve) => setTimeout(resolve, 5500));

	const rows = [];
	let previousWasRateSequence = false;
	const plan = makePlan(COUNT);

	for (let i = 0; i < plan.length; i++) {
		const attempt = plan[i];
		let state = states.get(attempt.form.lang);

		if (attempt.tokenMode === 'real_fresh') {
			state = await loadState(api, attempt.form);
		}

		if (!attempt.rateSequence || !previousWasRateSequence) {
			clearRateLimit();
		}

		const data = validData(state, i + 1, attempt.overrides);

		for (const key of attempt.omit || []) {
			data.delete(key);
		}

		const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

		if (attempt.xForwardedFor)
			headers['X-Forwarded-For'] = attempt.xForwardedFor;

		const response = await api.post(attempt.form.sendPath, {
			data: data.toString(),
			headers,
			maxRedirects: 5,
		});
		const html = await response.text();
		const actual = classify(html, attempt.form);
		const passed = actual.result === attempt.expected || (attempt.expected === 'invalid_fields' && actual.result === 'invalid_fields');

		rows.push({
			attempt_no: i + 1,
			scenario: attempt.scenario,
			lang: attempt.form.lang,
			country: data.get('country'),
			zip: data.get('zip'),
			token_mode: attempt.tokenMode,
			expected_result: attempt.expected,
			actual_result: actual.result,
			passed: passed ? 'yes' : 'no',
			error_text: actual.errorText,
			remote_addr: REMOTE_ADDR,
			x_forwarded_for: attempt.xForwardedFor || '',
			trusted_proxy_mode: TRUSTED_PROXY_MODE,
			rate_limit_dir: RATE_LIMIT_DIR,
			http_status: response.status(),
			entity_type: data.get('entity_type'),
			login: data.get('login'),
			name: data.get('name'),
			email: data.get('email'),
			birth: data.get('birth'),
			address: data.get('address'),
			city: data.get('city'),
			how: data.get('how'),
			note: data.get('note'),
			distribution: data.get('distribution'),
			location: data.get('location'),
			currency: data.get('currency'),
			website: data.get('website'),
			form_started_at: data.get('form_started_at'),
			form_token: data.get('form_token'),
			full_address: `${data.get('address')}, ${data.get('zip')} ${data.get('city')}, ${data.get('country')}`,
		});

		previousWasRateSequence = Boolean(attempt.rateSequence);

		if ((i + 1) % 25 === 0)
			console.log(`completed ${i + 1}/${plan.length}`);
	}

	await api.dispose();
	clearRateLimit();

	fs.mkdirSync(require('node:path').dirname(OUT), { recursive: true });
	fs.writeFileSync(
		OUT,
		`${HEADERS.join(',')}\n${rows.map((row) => HEADERS.map((header) => csvCell(row[header])).join(',')).join('\n')}\n`,
	);

	const failed = rows.filter((row) => row.passed !== 'yes');
	console.log(`wrote ${OUT}`);
	console.log(`rows=${rows.length} passed=${rows.length - failed.length} failed=${failed.length}`);

	if (failed.length)
		console.log(JSON.stringify(failed.slice(0, 10), null, 2));
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
