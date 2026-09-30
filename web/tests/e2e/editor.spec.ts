// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { expect, type Page, test } from '@playwright/test';

const USER = { email: 'teacher@school.ch' };
const QUIZ_ID = '00000000-0000-4000-8000-000000000001';

const RANGE_ANSWERS = { min: 0, max: 10, min_correct: 3, max_correct: 7 };

const STORED_QUIZ = {
  id: QUIZ_ID,
  user_id: '00000000-0000-4000-8000-0000000000ff',
  title: 'Irregular verbs',
  description: 'Past simple practice',
  public: true,
  cover_image: null,
  background_color: null,
  background_image: null,
  likes: 4,
  questions: [
    {
      type: 'ABCD',
      question: 'Past simple of "go"?',
      time: '20',
      image: null,
      answers: [
        { answer: 'went', right: true, color: '#E69F00' },
        { answer: 'goed', right: false, color: '#56B4E9' },
      ],
    },
    {
      type: 'RANGE',
      question: 'How many tenses?',
      time: '30',
      image: null,
      answers: RANGE_ANSWERS,
    },
  ],
};

type Saved = { editId: string | null; body: Record<string, unknown> };

/** The backend is not running in e2e, so the editor endpoints are faked. */
async function mockEditor(page: Page, options: { signedIn?: boolean; finishStatus?: number } = {}) {
  const started: URLSearchParams[] = [];
  const saved: Saved[] = [];
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

  await page.route('**/api/v1/users/check', (route) =>
    route.fulfill(options.signedIn === false ? json({ detail: 'x' }, 401) : json(USER)),
  );
  await page.route('**/api/v1/editor/start*', (route) => {
    started.push(new URL(route.request().url()).searchParams);
    return route.fulfill(json({ token: 'abcd1234' }));
  });
  await page.route('**/api/v1/editor/finish*', (route) => {
    const status = options.finishStatus ?? 200;
    if (status === 200) {
      saved.push({
        editId: new URL(route.request().url()).searchParams.get('edit_id'),
        body: route.request().postDataJSON(),
      });
    }
    return route.fulfill(json({}, status));
  });
  await page.route(`**/api/v1/quiz/get/${QUIZ_ID}`, (route) => route.fulfill(json(STORED_QUIZ)));
  await page.route('**/api/v1/quiz/get/missing', (route) =>
    route.fulfill(json({ detail: 'quiz not found' }, 404)),
  );
  // The dashboard, where a save ends up.
  await page.route('**/api/v1/quiz/list*', (route) => route.fulfill(json([])));
  await page.route('**/api/v1/quiztivity/', (route) => route.fulfill(json([])));

  return { started, saved };
}

/** The top bar's message. (The drag-and-drop live region is a second `status`.) */
const status = (page: Page) => page.locator('header').getByRole('status');

test('creates a multiple-choice quiz and saves it', async ({ page }) => {
  const backend = await mockEditor(page);
  await page.goto('/create');

  const save = page.getByRole('button', { name: 'Save' });
  await expect(save).toBeDisabled();
  await expect(status(page)).toHaveText('A title is required');

  await page.getByLabel('Title').fill('Weather words');
  await page.getByLabel('Description').fill('Vocabulary for unit 3');
  await expect(status(page)).toHaveText('You need at least one question');

  await page.getByRole('button', { name: 'Add new question' }).click();
  await page.getByRole('button', { name: /Multiple-Choice/ }).click();
  await page.getByLabel('Question', { exact: true }).fill('What falls from clouds?');
  await expect(status(page)).toHaveText('Question 1: You need at least 2 answers');

  await page.getByRole('button', { name: 'Add an answer' }).click();
  await page.getByRole('textbox', { name: 'Answer 1', exact: true }).fill('Rain');
  await page.getByRole('button', { name: 'Answer 1: Correct' }).click();
  await page.getByRole('button', { name: 'Add an answer' }).click();
  await page.getByRole('textbox', { name: 'Answer 2', exact: true }).fill('Sand');

  await expect(status(page)).toHaveText('Weather words');
  await save.click();

  await expect(page).toHaveURL(/\/dashboard$/);
  expect(backend.started[0]?.get('edit')).toBe('false');
  expect(backend.saved).toHaveLength(1);
  expect(backend.saved[0]?.editId).toBe('abcd1234');
  expect(backend.saved[0]?.body).toMatchObject({
    title: 'Weather words',
    description: 'Vocabulary for unit 3',
    public: false,
    questions: [
      {
        type: 'ABCD',
        question: 'What falls from clouds?',
        time: '20',
        answers: [
          { answer: 'Rain', right: true },
          { answer: 'Sand', right: false },
        ],
      },
    ],
  });
  // The client-side list keys never leave the browser.
  expect(JSON.stringify(backend.saved[0]?.body)).not.toContain('"key"');
  // A saved quiz leaves no draft behind.
  expect(await page.evaluate(() => localStorage.getItem('create_game'))).toBeNull();
});

test('keeps an unsaved new quiz as a draft', async ({ page, context }) => {
  await mockEditor(page);
  await page.goto('/create?title=Unit%204');
  await expect(page.getByLabel('Title')).toHaveValue('Unit 4');
  await page.getByLabel('Description').fill('Half-finished');

  const second = await context.newPage();
  await mockEditor(second);
  await second.goto('/create');
  await expect(second.getByLabel('Title')).toHaveValue('Unit 4');
  await expect(second.getByLabel('Description')).toHaveValue('Half-finished');
});

test('asks before leaving with unsaved changes', async ({ page }) => {
  await mockEditor(page);
  await page.goto('/create');
  await page.getByLabel('Title').fill('Unit 5');

  await page.getByRole('link', { name: 'Dashboard' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Leave without saving?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page).toHaveURL(/\/create$/);

  await page.getByRole('link', { name: 'Dashboard' }).click();
  await dialog.getByRole('button', { name: 'Leave' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('edits, reorders and saves an existing quiz', async ({ page }) => {
  const backend = await mockEditor(page);
  await page.goto(`/edit?quiz_id=${QUIZ_ID}`);

  await expect(page.getByLabel('Title')).toHaveValue('Irregular verbs');
  await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

  const sidebar = page.getByRole('navigation', { name: 'Questions' });
  await sidebar.getByRole('button', { name: /Past simple of "go"\?/ }).click();
  await page.getByLabel('Question', { exact: true }).fill('Past simple of "to go"?');

  // A type this PR cannot edit yet is shown, but its answers are left alone.
  await sidebar.getByRole('button', { name: /How many tenses\?/ }).click();
  await expect(page.getByText("This question type can't be edited here yet.")).toBeVisible();

  // Reorder from the keyboard: pick up question 1, move it down, drop it.
  await sidebar.getByRole('button', { name: 'Move question 1' }).focus();
  // Each step is announced to screen readers; waiting for that keeps the keys in step.
  const announcement = page.locator('[id^="DndLiveRegion"]');
  await page.keyboard.press('Space');
  await expect(announcement).toHaveText('Picked up question 1.');
  // On a phone the list scrolls inside a short panel, and the first arrow key may only
  // bring the next question into view.
  await expect(async () => {
    await page.keyboard.press('ArrowDown');
    await expect(announcement).toHaveText('Moved to position 2.', { timeout: 1000 });
  }).toPass();
  await page.keyboard.press('Space');
  await expect(sidebar.getByRole('listitem').first()).toContainText('How many tenses?');

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  expect(backend.started[0]?.get('edit')).toBe('true');
  expect(backend.started[0]?.get('quiz_id')).toBe(QUIZ_ID);
  const body = backend.saved[0]?.body as { questions: Record<string, unknown>[] };
  expect(body).not.toHaveProperty('id');
  expect(body.questions.map((q) => q.question)).toEqual([
    'How many tenses?',
    'Past simple of "to go"?',
  ]);
  expect(body.questions[0]?.answers).toEqual(RANGE_ANSWERS);
});

test('deletes a question after confirmation', async ({ page }) => {
  await mockEditor(page);
  await page.goto(`/edit?quiz_id=${QUIZ_ID}`);

  const sidebar = page.getByRole('navigation', { name: 'Questions' });
  await sidebar.getByRole('button', { name: 'Delete question 2' }).click();
  await page
    .getByRole('alertdialog', { name: 'Delete question 2?' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(sidebar.getByRole('listitem')).toHaveCount(1);
});

test('a failed save keeps the editor open', async ({ page }) => {
  await mockEditor(page, { finishStatus: 500 });
  await page.goto(`/edit?quiz_id=${QUIZ_ID}`);
  await page.getByLabel('Title').fill('Irregular verbs 2');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText("The quiz couldn't be saved.")).toBeVisible();
  await expect(page).toHaveURL(/\/edit\?quiz_id=/);
  await expect(page.getByLabel('Title')).toHaveValue('Irregular verbs 2');
});

test('reports a quiz that does not exist', async ({ page }) => {
  await mockEditor(page);
  await page.goto('/edit?quiz_id=missing');
  await expect(page.getByRole('heading', { name: 'Quiz not found' })).toBeVisible();
});

test('sends signed-out visitors to the login page and back', async ({ page }) => {
  await mockEditor(page, { signedIn: false });

  await page.goto('/create');
  await expect(page).toHaveURL(/\/account\/login\?returnTo=%2Fcreate$/);

  await page.goto(`/edit?quiz_id=${QUIZ_ID}`);
  await expect(page).toHaveURL(/\/account\/login\?returnTo=/);
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(`/edit?quiz_id=${QUIZ_ID}`);
});
