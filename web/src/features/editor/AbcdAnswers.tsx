// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { CheckCircle2, Circle, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { getForegroundColor } from '@/lib/color';
import { cn } from '@/lib/utils';
import { defaultAnswerColor, emptyAnswer, MAX_ABCD_ANSWERS } from './editorData';
import type { AbcdAnswer } from './types';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

type Props = {
  answers: AbcdAnswer[];
  onChange: (answers: AbcdAnswer[]) => void;
};

/**
 * Port of legacy `lib/editor/ABCDEditorPart.svelte`. Each answer has its text, a
 * right/wrong toggle and its own colour, which the play screens use for its tile.
 */
export function AbcdAnswers({ answers, onChange }: Props) {
  const { t } = useTranslation();

  const update = (index: number, patch: Partial<AbcdAnswer>) =>
    onChange(answers.map((answer, i) => (i === index ? { ...answer, ...patch } : answer)));

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {answers.map((answer, index) => {
        const color =
          answer.color && HEX_COLOR.test(answer.color) ? answer.color : defaultAnswerColor(index);
        const number = index + 1;
        const empty = answer.answer === '';
        return (
          // Answers have no id and can only be removed, so the position is their identity.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          <li key={index} className="overflow-hidden rounded-xl border bg-card">
            {/* The answer's own colour is quiz data, so it is applied inline. */}
            <div className="p-3" style={{ backgroundColor: color }}>
              <input
                type="text"
                name={`answer-${number}`}
                value={answer.answer}
                onChange={(event) => update(index, { answer: event.target.value })}
                placeholder={t('editor.enter_answer')}
                aria-label={`${t('words.answer')} ${number}`}
                aria-invalid={empty}
                style={{ color: getForegroundColor(color) }}
                className={cn(
                  'h-11 w-full rounded-md border-2 border-current/40 bg-transparent px-3 text-base font-medium outline-none',
                  'placeholder:text-current placeholder:opacity-70 focus-visible:border-current',
                  empty && 'border-dashed',
                )}
              />
            </div>
            <div className="flex items-center gap-2 p-2">
              <Button
                type="button"
                variant={answer.right ? 'default' : 'outline'}
                className="h-11 flex-1 justify-start"
                aria-pressed={answer.right}
                aria-label={`${t('words.answer')} ${number}: ${t('words.correct')}`}
                onClick={() => update(index, { right: !answer.right })}
              >
                {answer.right ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
                {t('words.correct')}
              </Button>
              <input
                type="color"
                name={`answer-${number}-color`}
                value={color}
                onChange={(event) => update(index, { color: event.target.value })}
                aria-label={`${t('words.answer')} ${number}: ${t('editor.answer_color')}`}
                className="size-11 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
              />
              {/* Legacy: right-click on the colour field. */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`${t('words.answer')} ${number}: ${t('editor.reset_color')}`}
                title={t('editor.reset_color')}
                onClick={() => update(index, { color: defaultAnswerColor(index) })}
              >
                <RotateCcw aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 text-destructive hover:text-destructive"
                aria-label={`${t('words.answer')} ${number}: ${t('editor.delete_answer')}`}
                title={t('editor.delete_answer')}
                onClick={() => onChange(answers.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </li>
        );
      })}
      {answers.length < MAX_ABCD_ANSWERS ? (
        <li>
          <Button
            type="button"
            variant="outline"
            className="h-full min-h-24 w-full border-dashed"
            onClick={() => onChange([...answers, emptyAnswer(answers.length)])}
          >
            <Plus aria-hidden="true" />
            {t('editor_page.add_an_answer')}
          </Button>
        </li>
      ) : null}
    </ul>
  );
}
