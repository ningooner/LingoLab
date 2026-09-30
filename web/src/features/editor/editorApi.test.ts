// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import { fetchQuizForEdit, QuizNotFoundError, saveQuiz, startEditSession } from './editorApi';
import type { EditorData } from './types';

const START = 'http://localhost/api/v1/editor/start';
const FINISH = 'http://localhost/api/v1/editor/finish';
const GET = 'http://localhost/api/v1/quiz/get/:quizId';

const QUIZ: EditorData = {
  title: 'Verbs',
  description: 'Practice',
  public: false,
  questions: [
    {
      type: 'ABCD',
      question: 'go?',
      time: '20',
      answers: [
        { answer: 'went', right: true, color: '#E69F00' },
        { answer: 'goed', right: false, color: '#56B4E9' },
      ],
    },
  ],
};

describe('startEditSession', () => {
  it('opens a session for a new quiz without a quiz id', async () => {
    let params: URLSearchParams | undefined;
    server.use(
      http.post(START, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({ token: 'abcd1234' });
      }),
    );
    await expect(startEditSession(null)).resolves.toBe('abcd1234');
    expect(params?.get('edit')).toBe('false');
    expect(params?.has('quiz_id')).toBe(false);
  });

  it('opens a session for an existing quiz', async () => {
    let params: URLSearchParams | undefined;
    server.use(
      http.post(START, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json({ token: 'abcd1234' });
      }),
    );
    await startEditSession('quiz-1');
    expect(params?.get('edit')).toBe('true');
    expect(params?.get('quiz_id')).toBe('quiz-1');
  });

  it("reports someone else's quiz as not found", async () => {
    server.use(http.post(START, () => HttpResponse.json({ detail: 'x' }, { status: 404 })));
    await expect(startEditSession('quiz-1')).rejects.toBeInstanceOf(QuizNotFoundError);
  });

  it('fails on any other error', async () => {
    server.use(http.post(START, () => new HttpResponse(null, { status: 500 })));
    await expect(startEditSession(null)).rejects.toThrow(/500/);
  });
});

describe('fetchQuizForEdit', () => {
  it('returns the quiz reduced to the editor fields', async () => {
    server.use(http.get(GET, () => HttpResponse.json({ ...QUIZ, id: 'quiz-1', likes: 2 })));
    const quiz = await fetchQuizForEdit('quiz-1');
    expect(quiz.title).toBe('Verbs');
    expect(quiz).not.toHaveProperty('id');
    expect(quiz).not.toHaveProperty('likes');
  });

  it.each([404, 400])('reports %i as not found', async (status) => {
    server.use(http.get(GET, () => HttpResponse.json({ detail: 'x' }, { status })));
    await expect(fetchQuizForEdit('quiz-1')).rejects.toBeInstanceOf(QuizNotFoundError);
  });

  it('fails on a server error', async () => {
    server.use(http.get(GET, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchQuizForEdit('quiz-1')).rejects.toThrow(/500/);
  });
});

describe('saveQuiz', () => {
  it('posts the quiz to the edit session', async () => {
    let editId: string | null = null;
    let body: unknown;
    server.use(
      http.post(FINISH, async ({ request }) => {
        editId = new URL(request.url).searchParams.get('edit_id');
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    await saveQuiz({ editId: 'abcd1234', quizId: null, data: QUIZ });
    expect(editId).toBe('abcd1234');
    expect(body).toEqual(QUIZ);
  });

  it('reopens an expired session once and saves again', async () => {
    const editIds: (string | null)[] = [];
    let started: URLSearchParams | undefined;
    server.use(
      http.post(START, ({ request }) => {
        started = new URL(request.url).searchParams;
        return HttpResponse.json({ token: 'fresh' });
      }),
      http.post(FINISH, ({ request }) => {
        const editId = new URL(request.url).searchParams.get('edit_id');
        editIds.push(editId);
        return editId === 'fresh'
          ? HttpResponse.json({})
          : HttpResponse.json({ detail: 'Edit ID not found!' }, { status: 401 });
      }),
    );
    await saveQuiz({ editId: 'stale', quizId: 'quiz-1', data: QUIZ });
    expect(editIds).toEqual(['stale', 'fresh']);
    expect(started?.get('quiz_id')).toBe('quiz-1');
  });

  it('gives up when the fresh session is rejected too', async () => {
    let attempts = 0;
    server.use(
      http.post(START, () => HttpResponse.json({ token: 'fresh' })),
      http.post(FINISH, () => {
        attempts += 1;
        return HttpResponse.json({ detail: 'Edit ID not found!' }, { status: 401 });
      }),
    );
    await expect(saveQuiz({ editId: 'stale', quizId: null, data: QUIZ })).rejects.toThrow();
    expect(attempts).toBe(2);
  });

  it('fails on a rejected quiz without retrying', async () => {
    let attempts = 0;
    server.use(
      http.post(FINISH, () => {
        attempts += 1;
        return HttpResponse.json({ detail: 'image url is not valid' }, { status: 400 });
      }),
    );
    await expect(saveQuiz({ editId: 'abcd1234', quizId: null, data: QUIZ })).rejects.toThrow(/400/);
    expect(attempts).toBe(1);
  });
});
