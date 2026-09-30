// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import { hasIssueAt, validateQuiz } from './editorSchema';
import type { EditorData, Question } from './types';

const abcd = (patch: Partial<Question> = {}): Question => ({
  type: 'ABCD',
  question: 'Past simple of "go"?',
  time: '20',
  answers: [
    { answer: 'went', right: true, color: '#E69F00' },
    { answer: 'goed', right: false, color: '#56B4E9' },
  ],
  ...patch,
});

const quiz = (patch: Partial<EditorData> = {}): EditorData => ({
  title: 'Irregular verbs',
  description: 'Past simple practice',
  public: false,
  questions: [abcd()],
  ...patch,
});

const messages = (data: EditorData) => validateQuiz(data).map((issue) => issue.message);

describe('validateQuiz', () => {
  it('accepts a complete ABCD quiz', () => {
    expect(validateQuiz(quiz())).toEqual([]);
  });

  it('reports the title first on an empty quiz, as legacy does', () => {
    expect(messages(quiz({ title: '', description: '', questions: [] }))[0]).toBe(
      'editor.errors.title_required',
    );
  });

  it.each([
    [{ title: 'ab' }, 'editor.errors.title_too_short'],
    [{ title: 'a'.repeat(301) }, 'editor.errors.title_too_long'],
    [{ description: '' }, 'editor.errors.description_required'],
    [{ description: 'a'.repeat(501) }, 'editor.errors.description_too_long'],
    [{ questions: [] }, 'editor.errors.min_questions'],
  ] as [Partial<EditorData>, string][])('rejects %j', (patch, message) => {
    expect(messages(quiz(patch))).toContain(message);
  });

  it('allows 50 questions and rejects 51 (legacy text said 32, its limit was 50)', () => {
    expect(validateQuiz(quiz({ questions: Array.from({ length: 50 }, () => abcd()) }))).toEqual([]);
    expect(messages(quiz({ questions: Array.from({ length: 51 }, () => abcd()) }))).toContain(
      'editor.errors.max_questions',
    );
  });

  it.each([
    [{ question: '' }, 'editor.errors.question_required'],
    [{ question: 'a'.repeat(300) }, 'editor.errors.question_too_long'],
    [{ time: '' }, 'editor.errors.time_positive'],
    [{ time: '0' }, 'editor.errors.time_positive'],
    [{ time: '-5' }, 'editor.errors.time_positive'],
    [{ answers: [] }, 'editor.errors.min_answers'],
    [{ answers: [{ answer: 'only one', right: true }] }, 'editor.errors.min_answers'],
    [
      {
        answers: [
          { answer: '', right: true },
          { answer: 'b', right: false },
        ],
      },
      'editor.errors.answer_required',
    ],
  ] as [Partial<Question>, string][])('rejects an ABCD question with %j', (patch, message) => {
    expect(messages(quiz({ questions: [abcd(patch)] }))).toContain(message);
  });

  it('locates a question issue by its index', () => {
    const issues = validateQuiz(quiz({ questions: [abcd(), abcd({ question: '' })] }));
    expect(hasIssueAt(issues, ['questions', 1])).toBe(true);
    expect(hasIssueAt(issues, ['questions', 0])).toBe(false);
    expect(issues[0]?.path).toEqual(['questions', 1, 'question']);
  });

  it('validates the other question types of an existing quiz by their type', () => {
    const others: Question[] = [
      { type: 'CHECK', question: 'q', time: '20', answers: abcd().answers },
      {
        type: 'RANGE',
        question: 'q',
        time: '20',
        answers: { min: 0, max: 10, min_correct: 3, max_correct: 7 },
      },
      {
        type: 'TEXT',
        question: 'q',
        time: '20',
        answers: [{ answer: 'a', case_sensitive: false }],
      },
      { type: 'VOTING', question: 'q', time: '20', answers: [{ answer: 'a' }, { answer: 'b' }] },
      {
        type: 'ORDER',
        question: 'q',
        time: '20',
        answers: [
          { answer: 'a', id: 0 },
          { answer: 'b', id: 1 },
        ],
      },
      { type: 'SLIDE', question: 'Slide', time: '120', answers: '{"elements":[]}' },
    ];
    expect(validateQuiz(quiz({ questions: others }))).toEqual([]);
    expect(
      messages(
        quiz({ questions: [{ type: 'SLIDE', question: 'Slide', time: '120', answers: '' }] }),
      ),
    ).toContain('editor.errors.slide_empty');
    expect(
      messages(quiz({ questions: [{ type: 'TEXT', question: 'q', time: '20', answers: [] }] })),
    ).toContain('editor.errors.min_answers_text');
  });

  it('only uses messages that exist in both languages', () => {
    const invalid = quiz({
      title: '',
      description: '',
      questions: [abcd({ question: '', time: '', answers: [] })],
    });
    for (const message of messages(invalid)) {
      const key = message.replace('editor.errors.', '');
      expect(en.editor.errors).toHaveProperty(key);
      expect(de.editor.errors).toHaveProperty(key);
    }
  });
});
