// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
// Port of legacy `lib/yupSchemas.ts` (yup → zod). Same limits; the messages are i18n keys
// instead of hardcoded English sentences.
import { z } from 'zod';
import type { QuizQuestionType } from './types';

const answerText = z.string().min(1, 'editor.errors.answer_required');

/** ABCD and CHECK. */
export const abcdAnswersSchema = z
  .array(z.object({ right: z.boolean(), answer: answerText }))
  .min(2, 'editor.errors.min_answers')
  .max(16, 'editor.errors.max_answers');

/** VOTING, and ORDER (legacy validates ORDER answers with the voting schema too). */
export const votingAnswersSchema = z
  .array(z.object({ answer: answerText, image: z.string().nullish() }))
  .min(2, 'editor.errors.min_answers')
  .max(16, 'editor.errors.max_answers');

export const textAnswersSchema = z
  .array(z.object({ case_sensitive: z.boolean(), answer: answerText }))
  .min(1, 'editor.errors.min_answers_text')
  .max(16, 'editor.errors.max_answers');

const rangeNumber = z.number('editor.errors.range_invalid').optional();
export const rangeAnswerSchema = z.object(
  { min: rangeNumber, max: rangeNumber, min_correct: rangeNumber, max_correct: rangeNumber },
  'editor.errors.range_invalid',
);

const slideSchema = z.string('editor.errors.slide_empty').min(1, 'editor.errors.slide_empty');

/**
 * Legacy picks the answer schema by sniffing the first answer's shape (`yup.lazy`), which
 * throws on an empty array and so reported a blank message. Every question carries its type
 * here, so the type decides; an empty answer list gets the "at least 2 answers" message.
 */
function answersSchemaFor(type: QuizQuestionType): z.ZodType {
  switch (type) {
    case 'ABCD':
    case 'CHECK':
      return abcdAnswersSchema;
    case 'VOTING':
    case 'ORDER':
      return votingAnswersSchema;
    case 'TEXT':
      return textAnswersSchema;
    case 'RANGE':
      return rangeAnswerSchema;
    case 'SLIDE':
      return slideSchema;
  }
}

export const questionTextSchema = z
  .string()
  .min(1, 'editor.errors.question_required')
  .max(299, 'editor.errors.question_too_long');

export const questionSchema = z
  .object({
    question: questionTextSchema,
    // Stored as a string; legacy lets yup cast it and requires a positive number.
    time: z
      .string()
      .refine((value) => value.trim() !== '' && Number(value) > 0, 'editor.errors.time_positive'),
    type: z.enum(['ABCD', 'RANGE', 'VOTING', 'SLIDE', 'TEXT', 'ORDER', 'CHECK']),
    image: z.string().nullish(),
    answers: z.unknown(),
  })
  .superRefine((question, ctx) => {
    const result = answersSchemaFor(question.type).safeParse(question.answers);
    if (result.success) return;
    for (const issue of result.error.issues) {
      ctx.addIssue({ code: 'custom', message: issue.message, path: ['answers', ...issue.path] });
    }
  });

export const titleSchema = z
  .string()
  .min(1, 'editor.errors.title_required')
  .min(3, 'editor.errors.title_too_short')
  .max(300, 'editor.errors.title_too_long');

export const descriptionSchema = z
  .string()
  .min(1, 'editor.errors.description_required')
  .min(3, 'editor.errors.description_too_short')
  .max(500, 'editor.errors.description_too_long');

export const MAX_QUESTIONS = 50;

export const dataSchema = z.object({
  public: z.boolean(),
  title: titleSchema,
  description: descriptionSchema,
  questions: z
    .array(questionSchema)
    .min(1, 'editor.errors.min_questions')
    // Legacy's message says 32 while the limit it enforces is 50; the limit wins.
    .max(MAX_QUESTIONS, 'editor.errors.max_questions'),
});

export type EditorIssue = {
  /** An i18n key. */
  message: string;
  path: (string | number)[];
};

/** Every problem in document order; an empty list means the quiz can be saved. */
export function validateQuiz(data: unknown): EditorIssue[] {
  const result = dataSchema.safeParse(data);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    message: issue.message,
    path: issue.path.filter((part) => typeof part !== 'symbol'),
  }));
}

/** Whether any issue lies at or below `path`, e.g. `['questions', 2]`. */
export function hasIssueAt(issues: EditorIssue[], path: (string | number)[]): boolean {
  return issues.some((issue) => path.every((part, index) => issue.path[index] === part));
}
