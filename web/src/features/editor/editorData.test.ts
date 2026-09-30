// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDraft,
  DEFAULT_ANSWER_COLORS,
  DRAFT_STORAGE_KEY,
  emptyQuestion,
  emptyQuiz,
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

  it('leaves the answers of other question types untouched', () => {
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
