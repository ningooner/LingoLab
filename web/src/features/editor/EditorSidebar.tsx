// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type EditorIssue, hasIssueAt } from './editorSchema';
import { TYPE_NAME_KEYS } from './questionTypes';
import type { AbcdAnswer, EditorQuestion, EditorState } from './types';

type Props = {
  state: EditorState;
  /** Null selects the quiz settings. */
  selectedKey: string | null;
  issues: EditorIssue[];
  onSelect: (key: string | null) => void;
  onMove: (from: number, to: number) => void;
  onDelete: (key: string) => void;
  onAdd: () => void;
};

const entryClass =
  'rounded-xl border bg-card text-left outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';
const selectedClass = 'border-primary bg-primary/5';

function InvalidMark() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex shrink-0 text-destructive">
      <AlertTriangle className="size-4" aria-hidden="true" />
      <span className="sr-only">{t('editor.needs_attention')}</span>
    </span>
  );
}

function AnswerChips({ answers }: { answers: AbcdAnswer[] }) {
  const { t } = useTranslation();
  return (
    <span className="grid grid-cols-2 gap-1">
      {answers.map((answer, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: answers have no id
          key={index}
          className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs"
        >
          {/* Right and wrong differ by icon, not by colour alone. */}
          {answer.right ? (
            <Check className="size-3 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <X className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className={cn('truncate', answer.answer === '' && 'italic text-muted-foreground')}>
            {answer.answer === '' ? t('editor.empty') : answer.answer}
          </span>
        </span>
      ))}
    </span>
  );
}

function SortableQuestion({
  question,
  index,
  selected,
  invalid,
  onSelect,
  onDelete,
}: {
  question: EditorQuestion;
  index: number;
  selected: boolean;
  invalid: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: question.key,
    attributes: { roleDescription: t('editor.reorder.role_description') },
  });
  const number = index + 1;
  const hasChips = question.type === 'ABCD' || question.type === 'CHECK';

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-stretch gap-1', isDragging && 'relative z-10 opacity-80')}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={t('editor.reorder.handle', { number })}
        className="flex w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        title={question.question}
        className={cn(
          entryClass,
          'flex min-h-11 min-w-0 flex-1 flex-col gap-2 p-3',
          selected && selectedClass,
        )}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground tabular-nums">{number}</span>
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm font-medium',
              question.question === '' && 'font-normal italic text-muted-foreground',
            )}
          >
            {question.question === '' ? t('editor.no_title') : question.question}
          </span>
          {question.image ? (
            <ImageIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-label={t('words.image')}
            />
          ) : null}
          {invalid ? <InvalidMark /> : null}
        </span>
        {hasChips && Array.isArray(question.answers) ? (
          <AnswerChips answers={question.answers as AbcdAnswer[]} />
        ) : (
          <span className="text-xs text-muted-foreground">{t(TYPE_NAME_KEYS[question.type])}</span>
        )}
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-auto min-h-11 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`${t('editor.delete_question')} ${number}`}
        title={t('editor.delete_question')}
        onClick={onDelete}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </li>
  );
}

/**
 * Port of legacy `lib/editor/sidebar.svelte`: the quiz settings entry, the question list
 * and "add question". Legacy reordered with a separate mode of up/down overlays; here each
 * question has a drag handle, which also works from the keyboard (Space, arrows, Space).
 */
export function EditorSidebar({
  state,
  selectedKey,
  issues,
  onSelect,
  onMove,
  onDelete,
  onAdd,
}: Props) {
  const { t } = useTranslation();
  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a click on the handle is not a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const hasMoved = useRef(false);
  const keys = state.questions.map((question) => question.key);
  const position = (id: string | number) => keys.indexOf(String(id)) + 1;
  const settingsInvalid = hasIssueAt(issues, ['title']) || hasIssueAt(issues, ['description']);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onMove(keys.indexOf(String(active.id)), keys.indexOf(String(over.id)));
  };

  return (
    <nav aria-label={t('words.question_plural')} className="flex flex-col gap-3 p-3">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-current={selectedKey === null ? 'true' : undefined}
        title={state.title}
        className={cn(
          entryClass,
          'flex min-h-11 flex-col gap-1 p-3',
          selectedKey === null && selectedClass,
        )}
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 truncate font-display text-sm font-semibold',
              state.title === '' && 'font-normal italic text-muted-foreground',
            )}
          >
            {state.title === '' ? t('editor.no_title') : state.title}
          </span>
          {settingsInvalid ? <InvalidMark /> : null}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {state.public ? (
            <Eye className="size-3" aria-hidden="true" />
          ) : (
            <EyeOff className="size-3" aria-hidden="true" />
          )}
          {state.public ? t('words.public') : t('words.private')}
        </span>
      </button>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{
          screenReaderInstructions: { draggable: t('editor.reorder.instructions') },
          announcements: {
            onDragStart: ({ active }) => {
              hasMoved.current = false;
              return t('editor.reorder.picked_up', { number: position(active.id) });
            },
            // A picked-up question is at once "over" itself; announcing that would replace
            // the pick-up message before it is read.
            onDragOver: ({ active, over }) => {
              if (!over || (over.id === active.id && !hasMoved.current)) return undefined;
              hasMoved.current = true;
              return t('editor.reorder.moved', { number: position(over.id) });
            },
            onDragEnd: ({ over }) =>
              over ? t('editor.reorder.dropped', { number: position(over.id) }) : undefined,
            onDragCancel: () => t('editor.reorder.cancelled'),
          },
        }}
      >
        <SortableContext items={keys} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-3">
            {state.questions.map((question, index) => (
              <SortableQuestion
                key={question.key}
                question={question}
                index={index}
                selected={question.key === selectedKey}
                invalid={hasIssueAt(issues, ['questions', index])}
                onSelect={() => onSelect(question.key)}
                onDelete={() => onDelete(question.key)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" className="h-11 border-dashed" onClick={onAdd}>
        <Plus aria-hidden="true" />
        {t('editor.add_new_question')}
      </Button>
    </nav>
  );
}
