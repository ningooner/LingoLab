// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { CheckCircle2, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AddAnswerButton } from './AddAnswerButton';
import { ColorAnswerTile } from './ColorAnswerTile';
import { emptyAnswer, MAX_ANSWERS } from './editorData';
import type { AbcdAnswer } from './types';

type Props = {
  answers: AbcdAnswer[];
  onChange: (answers: AbcdAnswer[]) => void;
};

/**
 * Port of legacy `lib/editor/ABCDEditorPart.svelte`, which serves ABCD and CHECK questions
 * alike: each answer has its text, a right/wrong toggle and its own colour. The two types
 * differ only in how a game scores them.
 */
export function AbcdAnswers({ answers, onChange }: Props) {
  const { t } = useTranslation();

  const update = (index: number, patch: Partial<AbcdAnswer>) =>
    onChange(answers.map((answer, i) => (i === index ? { ...answer, ...patch } : answer)));

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {answers.map((answer, index) => (
        // Answers have no id and can only be removed, so the position is their identity.
        // biome-ignore lint/suspicious/noArrayIndexKey: see above
        <li key={index}>
          <ColorAnswerTile
            index={index}
            answer={answer}
            placeholder={t('editor.enter_answer')}
            onChange={(patch) => update(index, patch)}
            onDelete={() => onChange(answers.filter((_, i) => i !== index))}
          >
            <Button
              type="button"
              variant={answer.right ? 'default' : 'outline'}
              className="h-11 flex-1 justify-start"
              aria-pressed={answer.right}
              aria-label={`${t('words.answer')} ${index + 1}: ${t('words.correct')}`}
              onClick={() => update(index, { right: !answer.right })}
            >
              {answer.right ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
              {t('words.correct')}
            </Button>
          </ColorAnswerTile>
        </li>
      ))}
      {answers.length < MAX_ANSWERS ? (
        <li>
          <AddAnswerButton
            className="h-full min-h-24"
            onClick={() => onChange([...answers, emptyAnswer(answers.length)])}
          />
        </li>
      ) : null}
    </ul>
  );
}
