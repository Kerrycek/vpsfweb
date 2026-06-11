import { expect, test, APIRequestContext } from 'playwright/test';
import { execSync } from 'node:child_process';

type RegistrationPaths = {
  name: string;
  formPath: string;
  ajaxFormPath: string;
  companyAjaxFormPath: string;
  sendPath: string;
  invalidTokenText: RegExp;
  tooSoonText: RegExp;
  honeypotText: RegExp;
  rateLimitText: RegExp;
  acceptedText: RegExp;
};

type FormState = {
  html: string;
  startedAt: string;
  token: string;
  distribution: string;
  location: string;
  currency: string;
};

const BASE_URL = process.env.REGISTRATION_BASE_URL ?? 'http://web.crucio.cz';
const RUN_MUTATING_TESTS = process.env.REGISTRATION_FORM_TEST_MODE === '1';
const RUN_RATE_LIMIT_TESTS = process.env.RUN_RATE_LIMIT_TESTS === '1';
const RATE_LIMIT_CLEAR_COMMAND = process.env.REGISTRATION_RATE_LIMIT_CLEAR_COMMAND;

const FORMS: RegistrationPaths[] = [
  {
    name: 'cs',
    formPath: '/prihlaska/',
    ajaxFormPath: '/prihlaska/fyzicka-osoba/form.php',
    companyAjaxFormPath: '/prihlaska/pravnicka-osoba/form.php',
    sendPath: '/prihlaska/send.php',
    invalidTokenText: /platnost formuláře nelze ověřit/i,
    tooSoonText: /odeslán příliš rychle/i,
    honeypotText: /nepodařilo uložit/i,
    rateLimitText: /příliš mnoho pokusů/i,
    acceptedText: /Přihláška přijata/i,
  },
  {
    name: 'en',
    formPath: '/registration/',
    ajaxFormPath: '/registration/fyzicka-osoba/form.php',
    companyAjaxFormPath: '/registration/pravnicka-osoba/form.php',
    sendPath: '/registration/send.php',
    invalidTokenText: /form validity cannot be verified/i,
    tooSoonText: /submitted too quickly/i,
    honeypotText: /cannot save your registration/i,
    rateLimitText: /too many attempts/i,
    acceptedText: /Registration form was saved/i,
  },
];

test.describe.configure({ mode: 'serial' });

for (const form of FORMS) {
  test(`${form.name}: form emits signed antispam fields`, async ({ request }) => {
    const state = await loadForm(request, form);

    expect(state.html).toContain('name="website"');
    expect(state.startedAt).toMatch(/^\d+$/);
    expect(state.token).toMatch(/^[a-f0-9]{64}$/);
    expect(state.distribution).not.toEqual('');
    expect(state.location).not.toEqual('');
    expect(state.currency).not.toEqual('');
  });

  test(`${form.name}: _mock=1 alone does not bypass antispam`, async ({ request }) => {
    const state = await loadForm(request, form);
    const data = validData(state);

    data.set('_mock', '1');
    data.delete('form_started_at');
    data.delete('form_token');

    const response = await postForm(request, form, data);
    const html = await response.text();

    expect(response.status()).toBe(200);
    expect(html).toMatch(form.invalidTokenText);
    expect(html).not.toMatch(form.acceptedText);
  });

  test(`${form.name}: forged timestamp/token is rejected`, async ({ request }) => {
    const state = await loadForm(request, form);
    const data = validData(state);

    data.set('_mock', '1');
    data.set('form_started_at', '1');
    data.set('form_token', 'bad-token-from-attacker');

    const response = await postForm(request, form, data);
    const html = await response.text();

    expect(response.status()).toBe(200);
    expect(html).toMatch(form.invalidTokenText);
    expect(html).not.toMatch(form.acceptedText);
  });

  test(`${form.name}: honeypot is rejected before save`, async ({ request }) => {
    const state = await loadForm(request, form);
    const data = validData(state, { website: 'https://spam.example/' });

    data.set('_mock', '1');

    const response = await postForm(request, form, data);
    const html = await response.text();

    expect(response.status()).toBe(200);
    expect(html).toMatch(form.honeypotText);
    expect(html).not.toMatch(form.acceptedText);
  });

  test(`${form.name}: real token submitted too quickly is rejected`, async ({ request }) => {
    const state = await loadForm(request, form);
    const data = validData(state);

    data.set('_mock', '1');

    const response = await postForm(request, form, data);
    const html = await response.text();

    expect(response.status()).toBe(200);
    expect(html).toMatch(form.tooSoonText);
    expect(html).not.toMatch(form.acceptedText);
  });

  test(`${form.name}: valid mocked submit passes after minimum fill time`, async ({ request }) => {
    test.skip(!RUN_MUTATING_TESTS, 'Run only against a dev server with REGISTRATION_FORM_TEST_MODE=1 so _mock prevents real registrations.');

    const state = await loadForm(request, form);
    await waitForAntispamDelay();
    clearRateLimit();

    const data = validData(state);
    data.set('_mock', '1');

    const response = await postForm(request, form, data);
    const html = await response.text();

    expect(response.status()).toBeLessThan(400);
    expect(html).toMatch(form.acceptedText);
  });

  test(`${form.name}: legal entity mocked submit passes with organization fields`, async ({ request }) => {
    test.skip(!RUN_MUTATING_TESTS, 'Run only against a dev server with REGISTRATION_FORM_TEST_MODE=1 so _mock prevents real registrations.');

    const state = await loadForm(request, form, form.companyAjaxFormPath);
    await waitForAntispamDelay();
    clearRateLimit();

    const data = validData(state, {
      entity_type: 'pravnicka',
      login: uniqueLogin('co'),
      name: form.name === 'cs' ? 'Jan Testovac' : 'John Tester',
      email: uniqueEmail('company'),
      org_name: form.name === 'cs' ? 'Codex Test sro' : 'Codex Test Ltd',
      ic: '12345678',
      address: form.name === 'cs' ? 'Anenska 1' : '221B Baker Street',
      city: form.name === 'cs' ? 'Decin' : 'London',
      zip: form.name === 'cs' ? '40502' : 'NW1 6XE',
      country: form.name === 'cs' ? 'CZ' : 'United Kingdom',
      how: 'Playwright legal entity test',
      note: 'company registration smoke',
    });
    data.set('_mock', '1');

    const response = await postForm(request, form, data);
    const html = await response.text();

    expect(response.status()).toBeLessThan(400);
    expect(html).toMatch(form.acceptedText);
  });

  test(`${form.name}: legal entity without ID is rejected`, async ({ request }) => {
    const state = await loadForm(request, form, form.companyAjaxFormPath);
    await waitForAntispamDelay();

    const data = validData(state, {
      entity_type: 'pravnicka',
      login: uniqueLogin('co'),
      name: form.name === 'cs' ? 'Jan Testovac' : 'John Tester',
      email: uniqueEmail('company-bad'),
      org_name: form.name === 'cs' ? 'Codex Test sro' : 'Codex Test Ltd',
      ic: '',
      how: 'Playwright legal entity negative test',
    });
    data.set('_mock', '1');

    const response = await postForm(request, form, data);
    const html = await response.text();

    expect(response.status()).toBe(200);
    expect(html).not.toMatch(form.acceptedText);
    expect(html).toMatch(/alert-danger|error/);
  });

  test(`${form.name}: changing X-Forwarded-For does not evade rate limit`, async ({ request }) => {
    test.skip(
      !RUN_MUTATING_TESTS || !RUN_RATE_LIMIT_TESTS,
      'Run only on isolated dev with REGISTRATION_FORM_TEST_MODE=1, RUN_RATE_LIMIT_TESTS=1 and a clean REGISTRATION_ANTISPAM_DIR.',
    );

    const state = await loadForm(request, form);
    await waitForAntispamDelay();
    clearRateLimit();

    for (let i = 0; i < 4; i++) {
      const data = validData(state, {
        login: uniqueLogin(`pwr${i}`),
        email: uniqueEmail(`rate-${i}`),
      });
      data.set('_mock', '1');

      const response = await postForm(request, form, data, {
        'X-Forwarded-For': `198.51.100.${10 + i}`,
      });
      const html = await response.text();

      if (i < 3) {
        expect(html).not.toMatch(form.rateLimitText);
      } else {
        expect(response.status()).toBe(200);
        expect(html).toMatch(form.rateLimitText);
        expect(html).not.toMatch(form.acceptedText);
      }
    }
  });
}

test('cs browser flow: immediate user submit shows timing error', async ({ page }) => {
  await page.goto(new URL('/prihlaska/', BASE_URL).toString());
  await fillVisibleValidFields(page);
  await page.locator('#send').click();
  await expect(page.locator('.alert-danger')).toContainText(/příliš rychle/i);
});

const POSTAL_POSITIVE_CASES = [
  { country: 'United Kingdom', zip: 'NW1 6XE', address: '221B Baker Street', city: 'London' },
  { country: 'Japan', zip: '131-0045', address: '1 Chome-1-2 Oshiage', city: 'Tokyo' },
  { country: 'Brazil', zip: '01310-200', address: 'Avenida Paulista 1578', city: 'Sao Paulo' },
  { country: 'Australia', zip: '2000', address: '1 Macquarie Street', city: 'Sydney' },
  { country: 'Singapore', zip: '018956', address: '10 Bayfront Avenue', city: 'Singapore' },
  { country: 'Czech Republic', zip: '12345', address: 'Krakovska 583/9', city: 'Praha' },
  { country: 'Czechia', zip: '123 45', address: 'Krakovska 583/9', city: 'Praha' },
  { country: 'Slovakia', zip: '12345', address: 'Namestie SNP 12', city: 'Bratislava' },
  { country: 'Slovensko', zip: '123 45', address: 'Namestie SNP 12', city: 'Bratislava' },
  { country: 'Uganda', zip: 'N/A', address: 'Plot 2 Kampala Road', city: 'Kampala' },
];

const POSTAL_NEGATIVE_CASES = [
  { country: 'Czech Republic', zip: 'ABCDE', address: 'Krakovska 583/9', city: 'Praha' },
  { country: 'Slovakia', zip: 'ABCDE', address: 'Namestie SNP 12', city: 'Bratislava' },
  { country: 'Atlantis', zip: '------', address: 'Ocean 123', city: 'Poseidon' },
  { country: 'Atlantis', zip: '12345678901234567890', address: 'Ocean 123', city: 'Poseidon' },
  { country: 'Atlantis', zip: '<script>alert(1)</script>', address: 'Ocean 123', city: 'Poseidon' },
  { country: 'Uganda', zip: '256', address: 'Plot 2 Kampala Road', city: 'Kampala' },
];

for (const form of FORMS) {
  test(`${form.name}: country-aware postal codes accept valid foreign formats`, async ({ request }) => {
    test.skip(
      !RUN_MUTATING_TESTS || !RATE_LIMIT_CLEAR_COMMAND,
      'Run only against isolated dev with REGISTRATION_FORM_TEST_MODE=1 and REGISTRATION_RATE_LIMIT_CLEAR_COMMAND.',
    );

    const state = await loadForm(request, form);
    await waitForAntispamDelay();

    for (const postalCase of POSTAL_POSITIVE_CASES) {
      clearRateLimit();

      const data = validData(state, {
        login: uniqueLogin('pc'),
        email: uniqueEmail('postal-ok'),
        address: postalCase.address,
        city: postalCase.city,
        zip: postalCase.zip,
        country: postalCase.country,
        how: `Postal positive ${postalCase.country}`,
      });
      data.set('_mock', '1');

      const response = await postForm(request, form, data);
      const html = await response.text();

      expect(response.status(), `${form.name} ${postalCase.country} ${postalCase.zip}`).toBeLessThan(400);
      expect(html, `${form.name} ${postalCase.country} ${postalCase.zip}`).toMatch(form.acceptedText);
    }
  });

  test(`${form.name}: country-aware postal codes reject malformed values`, async ({ request }) => {
    test.skip(
      !RUN_MUTATING_TESTS || !RATE_LIMIT_CLEAR_COMMAND,
      'Run only against isolated dev with REGISTRATION_FORM_TEST_MODE=1 and REGISTRATION_RATE_LIMIT_CLEAR_COMMAND.',
    );

    const state = await loadForm(request, form);
    await waitForAntispamDelay();

    for (const postalCase of POSTAL_NEGATIVE_CASES) {
      clearRateLimit();

      const data = validData(state, {
        login: uniqueLogin('pn'),
        email: uniqueEmail('postal-bad'),
        address: postalCase.address,
        city: postalCase.city,
        zip: postalCase.zip,
        country: postalCase.country,
        how: `Postal negative ${postalCase.country}`,
      });
      data.set('_mock', '1');

      const response = await postForm(request, form, data);
      const html = await response.text();

      expect(response.status(), `${form.name} ${postalCase.country} ${postalCase.zip}`).toBe(200);
      expect(html, `${form.name} ${postalCase.country} ${postalCase.zip}`).not.toMatch(form.acceptedText);
      expect(html, `${form.name} ${postalCase.country} ${postalCase.zip}`).toMatch(/alert-danger|error/);
    }
  });
}

async function loadForm(request: APIRequestContext, form: RegistrationPaths, path = form.ajaxFormPath): Promise<FormState> {
  const response = await request.get(new URL(path, BASE_URL).toString());
  expect(response.ok()).toBeTruthy();

  const html = await response.text();
  return {
    html,
    startedAt: inputValue(html, 'form_started_at'),
    token: inputValue(html, 'form_token'),
    distribution: firstSelectValue(html, 'distribution'),
    location: firstSelectValue(html, 'location'),
    currency: firstSelectValue(html, 'currency'),
  };
}

async function postForm(
  request: APIRequestContext,
  form: RegistrationPaths,
  data: URLSearchParams,
  headers: Record<string, string> = {},
) {
  return request.post(new URL(form.sendPath, BASE_URL).toString(), {
    data: data.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers,
    },
    maxRedirects: 5,
  });
}

function validData(state: FormState, overrides: Record<string, string> = {}): URLSearchParams {
  const data = new URLSearchParams({
    entity_type: 'fyzicka',
    login: uniqueLogin('pw'),
    name: 'Playwright Tester',
    email: uniqueEmail('antispam'),
    birth: '1990',
    address: 'Testova 123',
    city: 'Praha',
    zip: '12345',
    country: 'Czech Republic',
    how: 'Playwright antispam test',
    note: '',
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

async function fillVisibleValidFields(page: import('playwright/test').Page) {
  const entitySelect = page.locator('#entity_type');
  if (await entitySelect.count()) {
    await entitySelect.selectOption('fyzicka');
    await expect(page.locator('#login')).toBeVisible();
  }

  await page.locator('#login').fill(uniqueLogin('ui'));
  await page.locator('#name').fill('Playwright Tester');
  await page.locator('#birth').fill('1990');
  await page.locator('#address').fill('Testova 123');
  await page.locator('#city').fill('Praha');
  await page.locator('#zip').fill('12345');
  await page.locator('#country').fill('Czech Republic');
  await page.locator('#email').fill(uniqueEmail('ui'));
  await page.locator('#how').fill('Playwright browser test');
  await page.locator('#distribution').selectOption({ index: 1 });
  await page.locator('#location').selectOption({ index: 1 });
  await page.locator('#currency').selectOption({ index: 1 });
}

function inputValue(html: string, name: string): string {
  const input = html.match(new RegExp(`<input[^>]+name=["']${escapeRegExp(name)}["'][^>]*>`, 'i'))?.[0] ?? '';
  const value = input.match(/value=["']([^"']*)["']/i)?.[1] ?? '';
  return decodeHtml(value);
}

function firstSelectValue(html: string, name: string): string {
  const select = html.match(new RegExp(`<select[^>]+name=["']${escapeRegExp(name)}["'][^>]*>([\\s\\S]*?)<\\/select>`, 'i'))?.[1] ?? '';
  const option = select.match(/<option(?![^>]*disabled)[^>]*value=["']([^"']+)["'][^>]*>/i)?.[1] ?? '';
  return decodeHtml(option);
}

function uniqueLogin(prefix: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.replace(/[^a-z0-9]/gi, '').slice(-18);
  return `${prefix}${suffix}`.slice(0, 30);
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.invalid`;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function waitForAntispamDelay() {
  await new Promise((resolve) => setTimeout(resolve, 5500));
}

function clearRateLimit() {
  if (RATE_LIMIT_CLEAR_COMMAND) {
    execSync(RATE_LIMIT_CLEAR_COMMAND, { stdio: 'ignore' });
  }
}
