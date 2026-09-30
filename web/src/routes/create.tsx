// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { requireAuth } from '@/auth/auth';
import { emptyQuiz, loadDraft } from '@/features/editor/editorData';
import { QuizEditor } from '@/features/editor/QuizEditor';

function CreatePage() {
  const { title } = Route.useSearch();
  // Legacy `onMount`: a stored draft wins over `?title=`; otherwise start empty.
  const [initial] = useState(() => loadDraft() ?? emptyQuiz(title ?? ''));
  return <QuizEditor initial={initial} quizId={null} />;
}

export const Route = createFileRoute('/create')({
  // The router parses a digit-only `?title=2024` as a number; a title is always text.
  validateSearch: z.object({
    title: z.preprocess(
      (value) => (value === undefined ? undefined : String(value)),
      z.string().optional(),
    ),
  }),
  // Legacy `+page.server.ts`: signed-out visitors go to the login page and come back here.
  beforeLoad: ({ context }) => requireAuth(context.queryClient, '/create'),
  component: CreatePage,
});
