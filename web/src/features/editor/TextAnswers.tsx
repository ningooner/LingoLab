// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { CaseSensitive, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddAnswerButton } from './AddAnswerButton';
import { MAX_ANSWERS } from './editorData';
import type { TextAnswer } from './types';

type Props = {
  answers: TextAnswer[];
  onChange: (answers: TextAnswer[]) => void;
};

/**
 * Port of legacy `lib/editor/TextEditorPart.svelte`: the texts a player may type to be
 * right, each of them compared with or without regard to upper and lower case.
 */
export function TextAnswers({ answers, onChange }: Props) {
  const { t } = useTranslation();

  const update = (index: number, patch: Partial<TextAnswer>) =>
    onChange(answers.map((answer, i) => (i === index ? { ...answer, ...patch } : answer)));

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {answers.map((answer, index) => {
        const label = `${t('words.answer')} ${index + 1}`;
        return (
          // Answers have no id and can only be removed, so the position is their identity.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          <li key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-3">
            <Input
              name={`answer-${index + 1}`}
              value={answer.answer}
              onChange={(event) => update(index, { answer: event.target.value })}
              placeholder={t('editor.enter_answer')}
              aria-label={label}
              aria-invalid={answer.answer === ''}
              className="h-11"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={answer.case_sensitive ? 'default' : 'outline'}
                className="h-11 min-w-0 flex-1 justify-start"
                aria-pressed={answer.case_sensitive}
                aria-label={`${label}: ${t('editor.case_sensitive')}`}
                onClick={() => update(index, { case_sensitive: !answer.case_sensitive })}
              >
                <CaseSensitive aria-hidden="true" />
                <span className="truncate">{t('editor.case_sensitive')}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 text-destructive hover:text-destructive"
                aria-label={`${label}: ${t('editor.delete_answer')}`}
                title={t('editor.delete_answer')}
                onClick={() => onChange(answers.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </li>
        );
      })}
      {answers.length < MAX_ANSWERS ? (
        <li>
          <AddAnswerButton
            className="h-full min-h-24"
            onClick={() => onChange([...answers, { answer: '', case_sensitive: false }])}
          />
        </li>
      ) : null}
    </ul>
  );
}
