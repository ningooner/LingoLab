// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import type { QuizQuestionType } from './types';

/** i18n keys, as in legacy `card.svelte` (`type_to_name`) and `AddNewQuestionPopup.svelte`. */
export const TYPE_NAME_KEYS: Record<QuizQuestionType, string> = {
  ABCD: 'words.multiple_choice',
  CHECK: 'words.check_choice',
  VOTING: 'words.voting',
  ORDER: 'words.order',
  TEXT: 'words.text',
  RANGE: 'words.range',
  SLIDE: 'words.slide',
};

export const TYPE_DESCRIPTION_KEYS: Partial<Record<QuizQuestionType, string>> = {
  ABCD: 'editor.abcd_description',
  CHECK: 'editor.check_choice_description',
  VOTING: 'editor.voting_description',
  ORDER: 'editor.order_description',
  TEXT: 'editor.text_description',
  RANGE: 'editor.range_description',
};
