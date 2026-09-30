// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { RotateCcw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { getForegroundColor } from '@/lib/color';
import { cn } from '@/lib/utils';
import { defaultAnswerColor } from './editorData';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

type Props = {
  /** Position in the answer list; decides the default colour and the labels. */
  index: number;
  answer: { answer: string; color?: string | null };
  placeholder: string;
  onChange: (patch: { answer?: string; color?: string }) => void;
  onDelete: () => void;
  /** Controls specific to the question type, shown before the colour field. */
  children?: ReactNode;
};

/**
 * One answer with its own colour, which the play screens use for its tile. The part that
 * legacy's ABCD, voting and order editors share: text, colour, reset and delete.
 */
export function ColorAnswerTile({
  index,
  answer,
  placeholder,
  onChange,
  onDelete,
  children,
}: Props) {
  const { t } = useTranslation();
  const color =
    answer.color && HEX_COLOR.test(answer.color) ? answer.color : defaultAnswerColor(index);
  const number = index + 1;
  const empty = answer.answer === '';

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* The answer's own colour is quiz data, so it is applied inline. */}
      <div className="p-3" style={{ backgroundColor: color }}>
        <input
          type="text"
          name={`answer-${number}`}
          value={answer.answer}
          onChange={(event) => onChange({ answer: event.target.value })}
          placeholder={placeholder}
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
        {children}
        <input
          type="color"
          name={`answer-${number}-color`}
          value={color}
          onChange={(event) => onChange({ color: event.target.value })}
          aria-label={`${t('words.answer')} ${number}: ${t('editor.answer_color')}`}
          className={cn(
            'size-11 shrink-0 cursor-pointer rounded-md border bg-transparent p-1',
            !children && 'mr-auto',
          )}
        />
        {/* Legacy: right-click on the colour field. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={`${t('words.answer')} ${number}: ${t('editor.reset_color')}`}
          title={t('editor.reset_color')}
          onClick={() => onChange({ color: defaultAnswerColor(index) })}
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
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
