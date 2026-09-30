// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** The dashed "add an answer" slot that ends every answer list. */
export function AddAnswerButton({
  className,
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="outline"
      className={cn('w-full border-dashed', className)}
      onClick={onClick}
    >
      <Plus aria-hidden="true" />
      {t('editor_page.add_an_answer')}
    </Button>
  );
}
