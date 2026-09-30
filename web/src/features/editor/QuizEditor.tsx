// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useBlocker, useNavigate } from '@tanstack/react-router';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboardQueries } from '@/features/dashboard/dashboardApi';
import { useHideNavbar } from '@/stores/uiStore';
import { AddQuestionDialog } from './AddQuestionDialog';
import { EditorSidebar } from './EditorSidebar';
import { QuizNotFoundError, saveQuiz, startEditSession } from './editorApi';
import {
  clearDraft,
  emptyQuestion,
  moveItem,
  saveDraft,
  toEditorState,
  toQuizInput,
  withKey,
} from './editorData';
import { type EditorIssue, validateQuiz } from './editorSchema';
import { QuestionCard } from './QuestionCard';
import { SettingsCard } from './SettingsCard';
import type { EditorData, EditorState, Question, QuizQuestionType } from './types';

type Props = {
  /** The quiz to start from: empty, a restored draft, or the stored quiz. */
  initial: EditorData;
  /** Null creates a new quiz. */
  quizId: string | null;
};

/** Shown while the edit session (and, on `/edit`, the quiz) loads. */
export function EditorSkeleton() {
  return (
    <div className="flex h-dvh flex-col gap-4 p-4" aria-busy="true">
      <Skeleton className="h-11 w-full" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        <Skeleton className="h-40 w-full md:h-full md:w-80" />
        <Skeleton className="h-full w-full flex-1" />
      </div>
    </div>
  );
}

/** Load failures of the editor: the quiz is missing, or something else went wrong. */
export function EditorLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  const notFound = error instanceof QuizNotFoundError;
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center"
    >
      <h1 className="font-display text-2xl font-semibold">
        {notFound ? t('editor.quiz_not_found') : t('words.error')}
      </h1>
      <p className="text-muted-foreground">
        {notFound ? t('editor.quiz_not_found_text') : t('editor.load_failed')}
      </p>
      <div className="flex gap-2">
        {notFound ? null : (
          <Button type="button" className="h-11" onClick={onRetry}>
            {t('words.retry')}
          </Button>
        )}
        <Button asChild variant="secondary" className="h-11">
          <Link to="/dashboard">{t('words.dashboard')}</Link>
        </Button>
      </div>
    </div>
  );
}

/** The top bar's message: the first problem, located when it is inside a question. */
function issueText(issue: EditorIssue, t: (key: string) => string): string {
  const [area, index] = issue.path;
  const prefix =
    area === 'questions' && typeof index === 'number'
      ? `${t('words.question')} ${index + 1}: `
      : '';
  return prefix + t(issue.message);
}

/**
 * Port of legacy `lib/editor.svelte`, the editor shared by `/create` and `/edit`: an edit
 * session, the quiz held in memory and validated as a whole on every change, and a save
 * that ends the session.
 */
export function QuizEditor({ initial, quizId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useHideNavbar();

  const session = useQuery({
    queryKey: ['editor', 'session', quizId ?? 'new'],
    queryFn: () => startEditSession(quizId),
    // One session per visit: never reused from the cache, never refetched behind the form.
    gcTime: 0,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [state, setState] = useState<EditorState>(() => toEditorState(initial));
  const [initialJson] = useState(() => JSON.stringify(toQuizInput(state)));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const saved = useRef(false);

  const input = useMemo(() => toQuizInput(state), [state]);
  const issues = useMemo(() => validateQuiz(input), [input]);
  const dirty = useMemo(() => JSON.stringify(input) !== initialJson, [input, initialJson]);
  const creating = quizId === null;

  // Legacy stored the draft in `beforeunload` only, under a key nothing read. Here every
  // change to a new quiz is kept, so a crash or a closed tab loses nothing.
  useEffect(() => {
    if (creating && dirty && !saved.current) saveDraft(input);
  }, [creating, dirty, input]);

  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saved.current,
    enableBeforeUnload: () => dirty && !saved.current,
    withResolver: true,
  });

  const save = useMutation({
    mutationFn: (editId: string) => saveQuiz({ editId, quizId, data: input }),
    onSuccess: async () => {
      saved.current = true;
      if (creating) clearDraft();
      toast.success(
        creating ? t('create_page.success.title') : t('edit_page.success_update_title'),
      );
      await queryClient.invalidateQueries({ queryKey: dashboardQueries.items.queryKey });
      await navigate({ to: '/dashboard' });
    },
    onError: () => {
      toast.error(t('editor.save_failed'));
    },
  });

  if (session.isPending) return <EditorSkeleton />;
  if (session.isError) {
    return <EditorLoadError error={session.error} onRetry={() => void session.refetch()} />;
  }

  const selectedIndex = state.questions.findIndex((question) => question.key === selectedKey);
  const selected = state.questions[selectedIndex];
  const questionIssues = (index: number): EditorIssue[] =>
    issues
      .filter((issue) => issue.path[0] === 'questions' && issue.path[1] === index)
      .map((issue) => ({ ...issue, path: issue.path.slice(2) }));

  const updateQuestion = (key: string, patch: Partial<Question>) =>
    setState((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.key === key ? { ...question, ...patch } : question,
      ),
    }));

  const addQuestion = (type: QuizQuestionType) => {
    const question = withKey(emptyQuestion(type));
    setState((current) => ({ ...current, questions: [...current.questions, question] }));
    setSelectedKey(question.key);
    setAddOpen(false);
  };

  const deleteQuestion = (key: string) => {
    setState((current) => ({
      ...current,
      questions: current.questions.filter((question) => question.key !== key),
    }));
    // Legacy returns to the settings after a delete.
    setSelectedKey(null);
  };

  const firstIssue = issues[0];
  const pendingDeleteNumber =
    state.questions.findIndex((question) => question.key === pendingDelete) + 1;

  return (
    <div className="flex h-dvh flex-col">
      <h1 className="sr-only">{creating ? t('words.create') : t('words.edit')}</h1>
      <header className="flex items-center gap-3 border-b bg-card px-3 py-2">
        <Button asChild variant="ghost" className="h-11 shrink-0">
          <Link to="/dashboard">
            <ArrowLeft aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{t('words.dashboard')}</span>
          </Link>
        </Button>
        <p
          role="status"
          className={
            firstIssue
              ? 'flex min-w-0 flex-1 items-center justify-center gap-2 text-sm font-medium text-destructive'
              : 'min-w-0 flex-1 truncate text-center font-display font-semibold'
          }
        >
          {firstIssue ? (
            <>
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{issueText(firstIssue, t)}</span>
            </>
          ) : (
            state.title
          )}
        </p>
        <Button
          type="button"
          className="h-11 shrink-0"
          disabled={firstIssue !== undefined || save.isPending}
          onClick={() => save.mutate(session.data)}
        >
          {save.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {t('words.save')}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="max-h-64 shrink-0 overflow-y-auto border-b md:max-h-none md:w-80 md:border-r md:border-b-0">
          <EditorSidebar
            state={state}
            selectedKey={selected ? selected.key : null}
            issues={issues}
            onSelect={setSelectedKey}
            onMove={(from, to) =>
              setState((current) => ({
                ...current,
                questions: moveItem(current.questions, from, to),
              }))
            }
            onDelete={setPendingDelete}
            onAdd={() => setAddOpen(true)}
          />
        </aside>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          {selected ? (
            <QuestionCard
              // A fresh card per question, so its dialog state never carries over.
              key={selected.key}
              question={selected}
              number={selectedIndex + 1}
              issues={questionIssues(selectedIndex)}
              onChange={(patch) => updateQuestion(selected.key, patch)}
            />
          ) : (
            <SettingsCard
              settings={state}
              issues={issues}
              onChange={(patch) => setState((current) => ({ ...current, ...patch }))}
            />
          )}
        </div>
      </div>

      <AddQuestionDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addQuestion} />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('editor.delete_question_confirm.title', { number: pendingDeleteNumber })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('editor.delete_question_confirm.body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('words.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete !== null) deleteQuestion(pendingDelete);
              }}
            >
              {t('words.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blocker.status === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('editor.leave.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {creating ? t('editor.leave.body_create') : t('editor.leave.body_edit')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              {t('editor.leave.stay')}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => blocker.proceed?.()}>
              {t('editor.leave.leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
