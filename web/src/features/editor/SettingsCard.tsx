// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaComponent } from '@/components/MediaComponent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_BACKGROUND_COLOR } from './editorData';
import type { EditorIssue } from './editorSchema';
import type { EditorState } from './types';

type Settings = Omit<EditorState, 'questions'>;

type Props = {
  settings: Settings;
  issues: EditorIssue[];
  onChange: (patch: Partial<Settings>) => void;
};

/**
 * Port of legacy `lib/editor/settings-card.svelte`: the quiz's own fields. Cover and
 * background images can be removed here but not added until the uploader is ported.
 */
export function SettingsCard({ settings, issues, onChange }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const titleIssue = issues.find((issue) => issue.path[0] === 'title');
  const descriptionIssue = issues.find((issue) => issue.path[0] === 'description');
  const customBackground = Boolean(settings.background_color);

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-xl border bg-card p-4 sm:p-6"
    >
      <h2 id={`${id}-heading`} className="font-display text-xl font-semibold">
        {t('words.settings')}
      </h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-title`}>{t('words.title')}</Label>
        <Input
          id={`${id}-title`}
          value={settings.title}
          onChange={(event) => onChange({ title: event.target.value })}
          aria-invalid={titleIssue !== undefined}
          aria-describedby={titleIssue ? `${id}-title-error` : undefined}
          className="h-11"
        />
        {titleIssue ? (
          <p id={`${id}-title-error`} className="text-sm text-destructive">
            {t(titleIssue.message)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-description`}>{t('words.description')}</Label>
        <Textarea
          id={`${id}-description`}
          value={settings.description}
          onChange={(event) => onChange({ description: event.target.value })}
          aria-invalid={descriptionIssue !== undefined}
          aria-describedby={descriptionIssue ? `${id}-description-error` : undefined}
          className="min-h-24"
        />
        {descriptionIssue ? (
          <p id={`${id}-description-error`} className="text-sm text-destructive">
            {t(descriptionIssue.message)}
          </p>
        ) : null}
      </div>

      {settings.cover_image ? (
        <div className="flex flex-col items-start gap-2">
          <h3 className="text-sm font-medium">{t('editor.cover_image')}</h3>
          <MediaComponent src={settings.cover_image} className="h-56 w-full rounded-md sm:w-96" />
          {/* Legacy: right-click on the image. */}
          <Button type="button" variant="outline" onClick={() => onChange({ cover_image: null })}>
            <Trash2 aria-hidden="true" />
            {t('editor.remove_image')}
          </Button>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={`${id}-public`}>
          {settings.public ? (
            <Eye className="size-4" aria-hidden="true" />
          ) : (
            <EyeOff className="size-4" aria-hidden="true" />
          )}
          {t('words.public')}
        </Label>
        <Switch
          id={`${id}-public`}
          checked={settings.public}
          onCheckedChange={(checked) => onChange({ public: checked })}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor={`${id}-custom-bg`}>{t('editor.custom_bg_color')}</Label>
          <Switch
            id={`${id}-custom-bg`}
            checked={customBackground}
            // Off means "no colour stored": the play screens then use the standard background.
            onCheckedChange={(checked) =>
              onChange({ background_color: checked ? DEFAULT_BACKGROUND_COLOR : null })
            }
          />
        </div>
        {customBackground ? (
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor={`${id}-bg-color`}>{t('editor.bg_color')}</Label>
            <input
              id={`${id}-bg-color`}
              type="color"
              name="background_color"
              value={settings.background_color ?? DEFAULT_BACKGROUND_COLOR}
              onChange={(event) => onChange({ background_color: event.target.value })}
              className="size-11 cursor-pointer rounded-md border bg-transparent p-1"
            />
          </div>
        ) : null}
      </div>

      {settings.background_image ? (
        <div className="flex flex-col items-start gap-2">
          <h3 className="text-sm font-medium">{t('editor.bg_image')}</h3>
          <MediaComponent
            src={settings.background_image}
            className="h-56 w-full rounded-md sm:w-96"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange({ background_image: null })}
          >
            <Trash2 aria-hidden="true" />
            {t('editor.remove_image')}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
