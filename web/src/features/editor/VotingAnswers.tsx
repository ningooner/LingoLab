// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useTranslation } from 'react-i18next';
import { AddAnswerButton } from './AddAnswerButton';
import { ColorAnswerTile } from './ColorAnswerTile';
import { defaultAnswerColor, MAX_ANSWERS } from './editorData';
import type { VotingAnswer } from './types';

type Props = {
  answers: VotingAnswer[];
  onChange: (answers: VotingAnswer[]) => void;
};

/**
 * Port of legacy `lib/editor/VotingEditorPart.svelte`: answers with a text and a colour,
 * none of them right or wrong.
 */
export function VotingAnswers({ answers, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {answers.map((answer, index) => (
        // Answers have no id and can only be removed, so the position is their identity.
        // biome-ignore lint/suspicious/noArrayIndexKey: see above
        <li key={index}>
          <ColorAnswerTile
            index={index}
            answer={answer}
            placeholder={t('editor.empty')}
            onChange={(patch) =>
              onChange(answers.map((item, i) => (i === index ? { ...item, ...patch } : item)))
            }
            onDelete={() => onChange(answers.filter((_, i) => i !== index))}
          />
        </li>
      ))}
      {answers.length < MAX_ANSWERS ? (
        <li>
          <AddAnswerButton
            className="h-full min-h-24"
            onClick={() =>
              onChange([...answers, { answer: '', color: defaultAnswerColor(answers.length) }])
            }
          />
        </li>
      ) : null}
    </ul>
  );
}
