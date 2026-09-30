// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
// Port of the editor-related types in legacy `lib/quiz_types.ts`.

export const QUESTION_TYPES = [
  'ABCD',
  'RANGE',
  'VOTING',
  'SLIDE',
  'TEXT',
  'ORDER',
  'CHECK',
] as const;
export type QuizQuestionType = (typeof QUESTION_TYPES)[number];

/** Used by ABCD and CHECK questions. */
export type AbcdAnswer = { right: boolean; answer: string; color?: string | null };
export type RangeAnswer = { min: number; max: number; min_correct: number; max_correct: number };
export type TextAnswer = { answer: string; case_sensitive: boolean };
export type VotingAnswer = { answer: string; image?: string | null; color?: string | null };
export type OrderAnswer = { answer: string; color?: string | null; id?: number };

/** A SLIDE question stores its canvas as a string. */
export type Answers =
  | AbcdAnswer[]
  | RangeAnswer
  | TextAnswer[]
  | VotingAnswer[]
  | OrderAnswer[]
  | string;

export type Question = {
  /** Seconds, as a string: the backend model declares `time: str`. */
  time: string;
  question: string;
  type: QuizQuestionType;
  image?: string | null;
  answers: Answers;
  hide_results?: boolean | null;
};

/** The body of `POST /api/v1/editor/finish` (backend `QuizInput`). */
export type EditorData = {
  public: boolean;
  title: string;
  description: string;
  questions: Question[];
  cover_image?: string | null;
  background_color?: string | null;
  background_image?: string | null;
};

/**
 * Questions have no id in the backend model. The editor gives each one a client-side key,
 * so the sidebar can reorder them and React can follow a question through a move. Keys are
 * never sent or stored.
 */
export type EditorQuestion = Question & { key: string };
export type EditorState = Omit<EditorData, 'questions'> & { questions: EditorQuestion[] };
