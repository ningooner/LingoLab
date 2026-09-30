// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AddAnswerButton } from './AddAnswerButton';
import { ColorAnswerTile } from './ColorAnswerTile';
import { defaultAnswerColor, MAX_ANSWERS, moveItem } from './editorData';
import type { OrderAnswer } from './types';

type Props = {
  answers: OrderAnswer[];
  onChange: (answers: OrderAnswer[]) => void;
};

/**
 * Port of legacy `lib/editor/OrderEditorPart.svelte`: the answers are listed in their
 * correct order, and each one can be moved up or down.
 */
export function OrderAnswers({ answers, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <ol className="flex flex-col gap-4">
      {answers.map((answer, index) => {
        const label = `${t('words.answer')} ${index + 1}`;
        return (
          // The position is the answer's identity: it is what this list edits.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          <li key={index}>
            <ColorAnswerTile
              index={index}
              answer={answer}
              placeholder={t('editor.empty')}
              onChange={(patch) =>
                onChange(answers.map((item, i) => (i === index ? { ...item, ...patch } : item)))
              }
              onDelete={() => onChange(answers.filter((_, i) => i !== index))}
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                disabled={index === 0}
                aria-label={`${label}: ${t('editor.move_up')}`}
                title={t('editor.move_up')}
                onClick={() => onChange(moveItem(answers, index, index - 1))}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mr-auto size-11"
                disabled={index === answers.length - 1}
                aria-label={`${label}: ${t('editor.move_down')}`}
                title={t('editor.move_down')}
                onClick={() => onChange(moveItem(answers, index, index + 1))}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
            </ColorAnswerTile>
          </li>
        );
      })}
      {answers.length < MAX_ANSWERS ? (
        <li>
          <AddAnswerButton
            className="h-11"
            onClick={() =>
              onChange([...answers, { answer: '', color: defaultAnswerColor(answers.length) }])
            }
          />
        </li>
      ) : null}
    </ol>
  );
}
