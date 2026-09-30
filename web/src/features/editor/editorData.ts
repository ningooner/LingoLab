// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
// The editor's data operations, gathered from legacy `routes/create`, `routes/edit`,
// `lib/editor/AddNewQuestionPopup.svelte` and `lib/editor/ABCDEditorPart.svelte`.
import {
  type AbcdAnswer,
  type EditorData,
  type EditorQuestion,
  type EditorState,
  QUESTION_TYPES,
  type Question,
  type QuizQuestionType,
} from './types';

/**
 * Default colour of the nth answer. Stored per answer in the quiz, as in legacy, so these
 * are data, not styling. The values are the design system's answer-tile colours 1-4
 * (legacy used its own brown/green set).
 */
export const DEFAULT_ANSWER_COLORS = ['#E69F00', '#56B4E9', '#009E73', '#CC79A7'] as const;

/** The editor offers at most four answers, although the schema would accept 16. */
export const MAX_ABCD_ANSWERS = 4;

/** Picked when the custom background colour is switched on. */
export const DEFAULT_BACKGROUND_COLOR = '#ffffff';

/** Question types this editor can add and edit so far. Grows with PRs 2 and 5. */
export const EDITABLE_TYPES: readonly QuizQuestionType[] = ['ABCD'];

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `q${keyCounter}`;
}

export function defaultAnswerColor(index: number): string {
  return DEFAULT_ANSWER_COLORS[index % DEFAULT_ANSWER_COLORS.length] ?? DEFAULT_ANSWER_COLORS[0];
}

export function emptyAnswer(index: number): AbcdAnswer {
  return { answer: '', color: defaultAnswerColor(index), right: false };
}

export function emptyQuiz(title = ''): EditorData {
  return { title, description: '', public: false, questions: [] };
}

export function emptyQuestion(type: QuizQuestionType): Question {
  return {
    type,
    time: '20',
    question: '',
    image: null,
    answers:
      type === 'RANGE'
        ? { min: 0, max: 10, min_correct: 3, max_correct: 7 }
        : type === 'SLIDE'
          ? ''
          : [],
  };
}

export function toEditorState(data: EditorData): EditorState {
  return { ...data, questions: data.questions.map((q) => ({ ...q, key: nextKey() })) };
}

export function withKey(question: Question): EditorQuestion {
  return { ...question, key: nextKey() };
}

/** Drops the client-side keys: exactly what is sent to the backend and kept as a draft. */
export function toQuizInput(state: EditorState): EditorData {
  return { ...state, questions: state.questions.map(({ key: _key, ...question }) => question) };
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function isQuestionType(value: unknown): value is QuizQuestionType {
  return (QUESTION_TYPES as readonly unknown[]).includes(value);
}

function normaliseQuestion(raw: unknown): Question {
  const source = isRecord(raw) ? raw : {};
  // Legacy `/edit`: a question stored without a type is an ABCD question.
  const type = isQuestionType(source.type) ? source.type : 'ABCD';
  let answers = (source.answers ?? []) as Question['answers'];
  if ((type === 'ABCD' || type === 'CHECK') && Array.isArray(answers)) {
    // Legacy `set_colors_if_unset`, which ran when a question was opened.
    answers = (answers as AbcdAnswer[]).map((answer, index) =>
      answer.color ? answer : { ...answer, color: defaultAnswerColor(index) },
    );
  }
  return {
    type,
    question: typeof source.question === 'string' ? source.question : '',
    time: source.time === null || source.time === undefined ? '' : String(source.time),
    image: optionalString(source.image),
    answers,
    hide_results: source.hide_results === true,
  };
}

/**
 * Turns a stored quiz (`GET /quiz/get/{id}`) or a saved draft into editor data. Only the
 * fields the editor owns are kept; ids, counters and the like stay behind. Returns null
 * for anything that is not a quiz, e.g. a corrupt draft.
 */
export function normaliseQuiz(raw: unknown): EditorData | null {
  if (!isRecord(raw) || !Array.isArray(raw.questions)) return null;
  return {
    title: typeof raw.title === 'string' ? raw.title : '',
    // Nullable in the database (imported quizzes), required by the editor.
    description: typeof raw.description === 'string' ? raw.description : '',
    public: raw.public === true,
    cover_image: optionalString(raw.cover_image),
    background_color: optionalString(raw.background_color),
    background_image: optionalString(raw.background_image),
    questions: raw.questions.map(normaliseQuestion),
  };
}

/**
 * The `/create` draft. Legacy wrote its draft under `edit_game` and read it back from
 * `create_game`, so nothing was ever restored; this is the key the route reads.
 */
export const DRAFT_STORAGE_KEY = 'create_game';

export function loadDraft(): EditorData | null {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    return stored === null ? null : normaliseQuiz(JSON.parse(stored));
  } catch {
    // Unreadable storage or a corrupt draft: start empty, like a first visit.
    return null;
  }
}

export function saveDraft(data: EditorData): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // A full or blocked storage only costs the draft.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
