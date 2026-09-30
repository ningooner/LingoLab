// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { fetchClient } from '@/api/client';
import type { components } from '@/api/schema';
import { normaliseQuiz } from './editorData';
import type { EditorData } from './types';

/** The quiz does not exist, or belongs to someone else. */
export class QuizNotFoundError extends Error {
  constructor() {
    super('quiz not found');
    this.name = 'QuizNotFoundError';
  }
}

/** The edit session is gone: the backend keeps one for an hour. */
export class EditSessionExpiredError extends Error {
  constructor() {
    super('edit session expired');
    this.name = 'EditSessionExpiredError';
  }
}

/**
 * Opens an edit session and returns its id. `quizId` null creates a new quiz; otherwise
 * the session edits that quiz, which must belong to the signed-in user.
 */
export async function startEditSession(quizId: string | null): Promise<string> {
  const { data, response } = await fetchClient.POST('/api/v1/editor/start', {
    params: { query: quizId === null ? { edit: false } : { edit: true, quiz_id: quizId } },
  });
  if (response.status === 404) throw new QuizNotFoundError();
  if (!response.ok || !data?.token) {
    throw new Error(`Starting the editor failed with status ${response.status}`);
  }
  return data.token;
}

export async function fetchQuizForEdit(quizId: string): Promise<EditorData> {
  const { data, response } = await fetchClient.GET('/api/v1/quiz/get/{quiz_id}', {
    params: { path: { quiz_id: quizId } },
  });
  // 400 is the backend's answer to an id that is not a UUID.
  if (response.status === 404 || response.status === 400) throw new QuizNotFoundError();
  const quiz = response.ok ? normaliseQuiz(data) : null;
  if (!quiz) throw new Error(`Loading the quiz failed with status ${response.status}`);
  return quiz;
}

async function finishEdit(editId: string, data: EditorData): Promise<void> {
  const { response } = await fetchClient.POST('/api/v1/editor/finish', {
    params: { query: { edit_id: editId } },
    // `answers` also carries ORDER answers, which the generated union does not list.
    body: data as components['schemas']['QuizInput'],
  });
  // The endpoint has no auth dependency; its only 401 is "Edit ID not found".
  if (response.status === 401) throw new EditSessionExpiredError();
  if (!response.ok) throw new Error(`Saving the quiz failed with status ${response.status}`);
}

/**
 * Saves the quiz. An edit session lasts an hour, and legacy answered a save after that
 * with `alert('Error')`. Here an expired session is reopened once and the save repeated.
 */
export async function saveQuiz(options: {
  editId: string;
  quizId: string | null;
  data: EditorData;
}): Promise<void> {
  try {
    await finishEdit(options.editId, options.data);
  } catch (error) {
    if (!(error instanceof EditSessionExpiredError)) throw error;
    const editId = await startEditSession(options.quizId);
    await finishEdit(editId, options.data);
  }
}
