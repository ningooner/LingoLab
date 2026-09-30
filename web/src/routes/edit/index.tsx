// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { z } from 'zod';
import { requireAuth } from '@/auth/auth';
import { fetchQuizForEdit } from '@/features/editor/editorApi';
import { EditorLoadError, EditorSkeleton, QuizEditor } from '@/features/editor/QuizEditor';
import { useHideNavbar } from '@/stores/uiStore';

function EditPage() {
  const { quiz_id: quizId = '' } = Route.useSearch();
  useHideNavbar();
  const quiz = useQuery({
    queryKey: ['editor', 'quiz', quizId],
    queryFn: () => fetchQuizForEdit(quizId),
    // The editor works on its own copy: always load the stored quiz afresh when the page
    // opens, and never replace it behind the teacher's edits.
    gcTime: 0,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (quiz.isPending) return <EditorSkeleton />;
  if (quiz.isError) {
    return <EditorLoadError error={quiz.error} onRetry={() => void quiz.refetch()} />;
  }
  return <QuizEditor initial={quiz.data} quizId={quizId} />;
}

export const Route = createFileRoute('/edit/')({
  validateSearch: z.object({ quiz_id: z.string().optional() }),
  // Legacy `+page.server.ts`: the sign-in check comes first, then a missing id is a 404.
  beforeLoad: async ({ context, search }) => {
    await requireAuth(context.queryClient, `/edit?quiz_id=${search.quiz_id ?? ''}`);
    if (!search.quiz_id) throw notFound();
  },
  component: EditPage,
});
