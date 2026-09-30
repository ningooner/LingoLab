// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { fitRange } from './editorData';
import type { RangeAnswer } from './types';

type Props = {
  answer: RangeAnswer;
  onChange: (answer: RangeAnswer) => void;
};

/**
 * A whole-number field. The typed text is kept here, so a half-typed value ("-", "") is not
 * rewritten under the cursor; an empty field counts as 0, as in legacy.
 */
function BoundField({
  label,
  value,
  onCommit,
  onDone,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  /** The field was left: the value is final. */
  onDone: () => void;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        step={1}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          const parsed = Number(event.target.value);
          onCommit(Number.isFinite(parsed) ? Math.round(parsed) : 0);
        }}
        onBlur={() => {
          setText(String(value));
          onDone();
        }}
        className="h-11 w-28 tabular-nums"
      />
    </div>
  );
}

/**
 * Port of legacy `lib/editor/RangeSelectorEditorPart.svelte`: the span of numbers a player
 * can choose from, and inside it the span that counts as correct.
 */
export function RangeAnswerEditor({ answer, onChange }: Props) {
  const { t } = useTranslation();
  const usable = answer.max > answer.min;
  // The correct span is pulled inside the new bounds once a bound is final, not on every
  // keystroke: on the way from 10 to 50 the field reads 5.
  const fit = () => onChange(fitRange(answer));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <BoundField
          label={t('editor.range.min')}
          value={answer.min}
          onCommit={(min) => onChange({ ...answer, min })}
          onDone={fit}
        />
        <BoundField
          label={t('editor.range.max')}
          value={answer.max}
          onCommit={(max) => onChange({ ...answer, max })}
          onDone={fit}
        />
      </div>
      {/* Without a span there is nothing to slide along; the error below says why. */}
      {usable ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground tabular-nums">{answer.min}</span>
            <Slider
              min={answer.min}
              max={answer.max}
              step={1}
              value={[answer.min_correct, answer.max_correct]}
              thumbLabels={[t('editor.range.correct_from'), t('editor.range.correct_to')]}
              onValueChange={([low = answer.min_correct, high = answer.max_correct]) =>
                onChange(fitRange({ ...answer, min_correct: low, max_correct: high }))
              }
            />
            <span className="text-sm text-muted-foreground tabular-nums">{answer.max}</span>
          </div>
          <p className="text-sm">
            {t('editor.range.summary', {
              minCorrect: answer.min_correct,
              maxCorrect: answer.max_correct,
              min: answer.min,
              max: answer.max,
            })}
          </p>
        </>
      ) : null}
    </div>
  );
}
