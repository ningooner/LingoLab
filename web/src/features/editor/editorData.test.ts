// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDraft,
  DEFAULT_ANSWER_COLORS,
  DEFAULT_RANGE_ANSWER,
  DRAFT_STORAGE_KEY,
  EDITABLE_TYPES,
  emptyQuestion,
  emptyQuiz,
  fitRange,
  loadDraft,
  moveItem,
  normaliseQuiz,
  saveDraft,
  toEditorState,
  toQuizInput,
} from './editorData';

describe('normaliseQuiz', () => {
  it('keeps only the fields the editor owns', () => {
    const quiz = normaliseQuiz({
      id: 'abc',
      user_id: 'u-1',
      likes: 3,
      title: 'Verbs',
      description: 'Practice',
      public: true,
      cover_image: '',
      questions: [],
    });
    expect(quiz).toEqual({
      title: 'Verbs',
      description: 'Practice',
      public: true,
      cover_image: null,
      background_color: null,
      background_image: null,
      questions: [],
    });
  });

  it('treats a question without a type as ABCD, as legacy /edit does', () => {
    const quiz = normaliseQuiz({
      title: 't',
      questions: [{ question: 'q', time: 20, answers: [{ answer: 'a', right: true }] }],
    });
    expect(quiz?.questions[0]).toMatchObject({ type: 'ABCD', time: '20' });
  });

  it('fills in missing answer colours by position', () => {
    const quiz = normaliseQuiz({
      title: 't',
      questions: [
        {
          type: 'ABCD',
          question: 'q',
          time: '20',
          answers: [
            { answer: 'a', right: true },
            { answer: 'b', right: false, color: '#123456' },
          ],
        },
      ],
    });
    expect(quiz?.questions[0]?.answers).toEqual([
      { answer: 'a', right: true, color: DEFAULT_ANSWER_COLORS[0] },
      { answer: 'b', right: false, color: '#123456' },
    ]);
  });

  it('leaves a complete RANGE answer and a SLIDE canvas untouched', () => {
    const range = { min: 0, max: 10, min_correct: 3, max_correct: 7 };
    const quiz = normaliseQuiz({
      title: 't',
      questions: [
        { type: 'RANGE', question: 'q', time: '20', answers: range },
        { type: 'SLIDE', question: 'Slide', time: '120', answers: '{"a":1}' },
      ],
    });
    expect(quiz?.questions.map((q) => q.answers)).toEqual([range, '{"a":1}']);
  });

  it('gives a RANGE question without its numbers the default range', () => {
    const quiz = normaliseQuiz({
      title: 't',
      questions: [{ type: 'RANGE', question: 'q', time: '20', answers: [] }],
    });
    expect(quiz?.questions[0]?.answers).toEqual(DEFAULT_RANGE_ANSWER);
  });

  it('keeps the stored case sensitivity of TEXT answers (legacy reset it to false)', () => {
    const quiz = normaliseQuiz({
      title: 't',
      questions: [
        {
          type: 'TEXT',
          question: 'q',
          time: '20',
          answers: [{ answer: 'London', case_sensitive: true }, { answer: 'london' }],
        },
      ],
    });
    expect(quiz?.questions[0]?.answers).toEqual([
      { answer: 'London', case_sensitive: true },
      { answer: 'london', case_sensitive: false },
    ]);
  });

  it('fills in colours for VOTING and ORDER answers and drops the ORDER id', () => {
    const quiz = normaliseQuiz({
      title: 't',
      questions: [
        {
          type: 'VOTING',
          question: 'q',
          time: '20',
          answers: [
            { answer: 'a', image: 'img' },
            { answer: 'b', color: '#123456' },
          ],
        },
        {
          type: 'ORDER',
          question: 'q',
          time: '20',
          answers: [
            { answer: 'first', id: [0] },
            { answer: 'second', color: '#123456', id: 1 },
          ],
        },
      ],
    });
    expect(quiz?.questions[0]?.answers).toEqual([
      { answer: 'a', image: 'img', color: DEFAULT_ANSWER_COLORS[0] },
      { answer: 'b', color: '#123456' },
    ]);
    expect(quiz?.questions[1]?.answers).toEqual([
      { answer: 'first', color: DEFAULT_ANSWER_COLORS[0] },
      { answer: 'second', color: '#123456' },
    ]);
  });

  it('turns a missing answer list into an empty one', () => {
    const quiz = normaliseQuiz({
      title: 't',
      questions: [{ type: 'CHECK', question: 'q', time: '20' }],
    });
    expect(quiz?.questions[0]?.answers).toEqual([]);
  });

  it('turns a null description into an empty one', () => {
    expect(normaliseQuiz({ title: 't', description: null, questions: [] })?.description).toBe('');
  });

  it('rejects anything that is not a quiz', () => {
    expect(normaliseQuiz(null)).toBeNull();
    expect(normaliseQuiz('quiz')).toBeNull();
    expect(normaliseQuiz({ title: 't' })).toBeNull();
  });
});

describe('editor state', () => {
  it('gives every question a distinct key and strips it again', () => {
    const data = {
      ...emptyQuiz('Verbs'),
      questions: [emptyQuestion('ABCD'), emptyQuestion('ABCD')],
    };
    const state = toEditorState(data);
    expect(new Set(state.questions.map((q) => q.key)).size).toBe(2);
    expect(toQuizInput(state)).toEqual(data);
  });

  it('starts a new question with 20 seconds and no answers', () => {
    expect(emptyQuestion('ABCD')).toEqual({
      type: 'ABCD',
      time: '20',
      question: '',
      image: null,
      answers: [],
    });
  });
});

describe('moveItem', () => {
  it('moves an item down and up', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('ignores positions outside the list', () => {
    const items = ['a', 'b'];
    expect(moveItem(items, 0, 5)).toBe(items);
    expect(moveItem(items, -1, 1)).toBe(items);
  });
});

describe('draft', () => {
  beforeEach(() => localStorage.clear());

  it('is stored under the key /create reads (legacy wrote a different one)', () => {
    saveDraft(emptyQuiz('Draft'));
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem('edit_game')).toBeNull();
    expect(loadDraft()?.title).toBe('Draft');
  });

  it('is gone after clearing', () => {
    saveDraft(emptyQuiz('Draft'));
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it('ignores a corrupt draft', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, '{not json');
    expect(loadDraft()).toBeNull();
    localStorage.setItem(DRAFT_STORAGE_KEY, '"text"');
    expect(loadDraft()).toBeNull();
  });
});

describe('fitRange', () => {
  it('pulls the correct span inside the selectable span', () => {
    expect(fitRange({ min: 5, max: 6, min_correct: 3, max_correct: 7 })).toEqual({
      min: 5,
      max: 6,
      min_correct: 5,
      max_correct: 6,
    });
  });

  it('rounds to whole numbers, which the backend requires', () => {
    expect(fitRange({ min: 0.4, max: 9.6, min_correct: 2.5, max_correct: 7.2 })).toEqual({
      min: 0,
      max: 10,
      min_correct: 3,
      max_correct: 7,
    });
  });

  it('leaves the correct span alone while the bounds are not a span', () => {
    expect(fitRange({ min: 10, max: 0, min_correct: 3, max_correct: 7 })).toEqual({
      min: 10,
      max: 0,
      min_correct: 3,
      max_correct: 7,
    });
  });
});

describe('new questions', () => {
  it('can be added for every type but SLIDE', () => {
    expect([...EDITABLE_TYPES].sort()).toEqual(
      ['ABCD', 'CHECK', 'ORDER', 'RANGE', 'TEXT', 'VOTING'].sort(),
    );
  });

  it('start a RANGE question with its own copy of the default range', () => {
    const answers = emptyQuestion('RANGE').answers;
    expect(answers).toEqual(DEFAULT_RANGE_ANSWER);
    expect(answers).not.toBe(DEFAULT_RANGE_ANSWER);
  });
});
