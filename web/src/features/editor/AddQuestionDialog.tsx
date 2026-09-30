// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EDITABLE_TYPES } from './editorData';
import { TYPE_DESCRIPTION_KEYS, TYPE_NAME_KEYS } from './questionTypes';
import type { QuizQuestionType } from './types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: QuizQuestionType) => void;
};

/**
 * Port of legacy `lib/editor/AddNewQuestionPopup.svelte`. It lists the types the editor
 * can build so far; legacy's link to the question-type docs returns with `/docs`.
 */
export function AddQuestionDialog({ open, onOpenChange, onAdd }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {t('quiztivity.editor.select_page_type')}
          </DialogTitle>
        </DialogHeader>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EDITABLE_TYPES.map((type) => {
            const descriptionKey = TYPE_DESCRIPTION_KEYS[type];
            return (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => onAdd(type)}
                  className="flex min-h-11 w-full flex-col gap-1 rounded-xl border p-4 text-left outline-none hover:border-primary hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="font-display text-base font-semibold">
                    {t(TYPE_NAME_KEYS[type])}
                  </span>
                  {descriptionKey ? (
                    <span className="text-sm text-muted-foreground">{t(descriptionKey)}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
