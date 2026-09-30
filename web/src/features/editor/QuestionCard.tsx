// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Clock, Settings2, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaComponent } from '@/components/MediaComponent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AbcdAnswers } from './AbcdAnswers';
import { EDITABLE_TYPES } from './editorData';
import type { EditorIssue } from './editorSchema';
import { TYPE_NAME_KEYS } from './questionTypes';
import type { AbcdAnswer, Question } from './types';

type Props = {
  question: Question;
  /** Position in the quiz, for the heading. */
  number: number;
  /** This question's issues, with paths relative to the question. */
  issues: EditorIssue[];
  onChange: (patch: Partial<Question>) => void;
};

/** Port of legacy `lib/editor/card.svelte`: one question's fields. */
export function QuestionCard({ question, number, issues, onChange }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const textIssue = issues.find((issue) => issue.path[0] === 'question');
  const timeIssue = issues.find((issue) => issue.path[0] === 'time');
  // A problem with the answer list itself (too few); a single empty answer is marked on its field.
  const answersIssue = issues.find(
    (issue) => issue.path[0] === 'answers' && issue.path.length === 1,
  );
  const editable = EDITABLE_TYPES.includes(question.type);

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-xl border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={`${id}-heading`} className="font-display text-xl font-semibold whitespace-nowrap">
          {t('words.question')} {number}
        </h2>
        <Badge variant="secondary">{t(TYPE_NAME_KEYS[question.type])}</Badge>
        <Button
          type="button"
          variant="outline"
          className="ml-auto h-11"
          onClick={() => setAdvancedOpen(true)}
        >
          <Settings2 aria-hidden="true" />
          {t('editor.advanced_settings')}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-question`}>{t('words.question')}</Label>
        <Input
          id={`${id}-question`}
          value={question.question}
          onChange={(event) => onChange({ question: event.target.value })}
          aria-invalid={textIssue !== undefined}
          aria-describedby={textIssue ? `${id}-question-error` : undefined}
          className="h-11"
        />
        {textIssue ? (
          <p id={`${id}-question-error`} className="text-sm text-destructive">
            {t(textIssue.message)}
          </p>
        ) : null}
      </div>

      {question.image ? (
        <div className="flex flex-col items-start gap-2">
          <MediaComponent src={question.image} className="h-56 w-full rounded-md sm:w-96" />
          <Button type="button" variant="outline" onClick={() => onChange({ image: null })}>
            <Trash2 aria-hidden="true" />
            {t('editor.remove_image')}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-time`}>
          <Clock className="size-4" aria-hidden="true" />
          {t('editor.time_in_seconds')}
        </Label>
        <Input
          id={`${id}-time`}
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={question.time}
          // Legacy cuts the value to three digits (its check compared the value, not its
          // length, with 3; the intent is the field's own max of 999).
          onChange={(event) => onChange({ time: event.target.value.slice(0, 3) })}
          aria-invalid={timeIssue !== undefined}
          aria-describedby={timeIssue ? `${id}-time-error` : undefined}
          className="h-11 w-28 tabular-nums"
        />
        {timeIssue ? (
          <p id={`${id}-time-error`} className="text-sm text-destructive">
            {t(timeIssue.message)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-display text-base font-semibold">{t('words.answer_plural')}</h3>
        {editable && Array.isArray(question.answers) ? (
          <>
            <AbcdAnswers
              answers={question.answers as AbcdAnswer[]}
              onChange={(answers) => onChange({ answers })}
            />
            {answersIssue ? (
              <p className="text-sm text-destructive">{t(answersIssue.message)}</p>
            ) : null}
          </>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            {t('editor.type_not_editable_yet')}
          </p>
        )}
      </div>

      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{t('editor.advanced_settings')}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Checkbox
              id={`${id}-hide-results`}
              checked={question.hide_results === true}
              onCheckedChange={(checked) => onChange({ hide_results: checked === true })}
            />
            <Label htmlFor={`${id}-hide-results`}>{t('editor.hide_question_results')}</Label>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" className="h-11">
                {t('words.close')}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
