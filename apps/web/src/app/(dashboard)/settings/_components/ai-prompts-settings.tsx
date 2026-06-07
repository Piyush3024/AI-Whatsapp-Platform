"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@repo/ui/components/form";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Badge } from "@repo/ui/components/badge";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Icons } from "@repo/ui/components/icons";
import {
  useAiPrompts,
  useUpsertAiPrompt,
  useDeleteAiPrompt,
} from "../hooks/use-ai-prompts";
import { SUPPORTED_LANGUAGES } from "@/types/ai-prompt.types";
import type { AiPrompt } from "@/types/ai-prompt.types";

const promptSchema = z.object({
  persona: z
    .string()
    .trim()
    .min(2, "Persona must be at least 2 characters.")
    .max(100),
  systemPrompt: z
    .string()
    .trim()
    .min(10, "System prompt must be at least 10 characters.")
    .max(4000),
  language: z.string().default("auto"),
});

type PromptFormValues = z.infer<typeof promptSchema>;

function getLanguageLabel(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

function PromptCard({
  prompt,
  onEdit,
}: {
  prompt: AiPrompt;
  onEdit: (prompt: AiPrompt) => void;
}) {
  const { mutate: deletePrompt, isPending: isDeleting } = useDeleteAiPrompt();

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{prompt.persona}</p>
            <Badge
              variant={prompt.language === "auto" ? "default" : "secondary"}
            >
              {getLanguageLabel(prompt.language)}
            </Badge>
            {!prompt.isActive && (
              <Badge variant="outline" className="text-muted-foreground">
                Inactive
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              v{prompt.version}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {prompt.systemPrompt}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 cursor-pointer"
            onClick={() => onEdit(prompt)}
          >
            <Icons.edit className="size-3.5" />
          </Button>
          {prompt.language !== "auto" && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 cursor-pointer text-destructive hover:text-destructive"
              onClick={() => deletePrompt(prompt.id)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Icons.spinner className="size-3.5 animate-spin" />
              ) : (
                <Icons.delete className="size-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AiPromptsSettings() {
  const { data: prompts, isPending } = useAiPrompts();
  const { mutate: upsert, isPending: isSaving } = useUpsertAiPrompt();
  const [editingPrompt, setEditingPrompt] = useState<AiPrompt | null>(null);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema) as Resolver<PromptFormValues>,
    defaultValues: { persona: "", systemPrompt: "", language: "auto" },
  });

  const handleEdit = (prompt: AiPrompt) => {
    setEditingPrompt(prompt);
    form.reset({
      persona: prompt.persona,
      systemPrompt: prompt.systemPrompt,
      language: prompt.language,
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingPrompt(null);
    form.reset({ persona: "", systemPrompt: "", language: "en" });
    setShowForm(true);
  };

  const onSubmit = (values: PromptFormValues) => {
    upsert(values, {
      onSuccess: () => {
        setShowForm(false);
        setEditingPrompt(null);
        form.reset();
      },
    });
  };

  // Languages already configured — prevent duplicates
  const usedLanguages = new Set(prompts?.map((p) => p.language) ?? []);
  const availableLanguages = SUPPORTED_LANGUAGES.filter(
    (l) => !usedLanguages.has(l.code) || l.code === editingPrompt?.language,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Configuration</CardTitle>
            <CardDescription>
              Configure per-language AI prompts. The worker detects the
              customer&apos;s language and selects the matching prompt
              automatically. The &quot;Default&quot; prompt is used as fallback.
            </CardDescription>
          </div>
          {!showForm && (
            <Button
              size="sm"
              onClick={handleNew}
              className="cursor-pointer shrink-0"
            >
              <Icons.add className="size-4 mr-2" />
              Add Language
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt list */}
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : !prompts?.length ? (
          <p className="text-sm text-muted-foreground">
            No AI prompts configured. Add a default prompt to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {/* Show auto/default first */}
            {[...prompts]
              .sort((a, b) =>
                a.language === "auto" ? -1 : b.language === "auto" ? 1 : 0,
              )
              .map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onEdit={handleEdit}
                />
              ))}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
            <p className="text-sm font-medium">
              {editingPrompt ? "Edit Prompt" : "New Language Prompt"}
            </p>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="persona"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persona Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Friendly Salon Assistant"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!!editingPrompt}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableLanguages.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="systemPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="You are a helpful assistant for [Business Name]. Be concise and friendly..."
                          className="min-h-32 resize-y font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/4000 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Icons.spinner className="mr-2 size-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save Prompt"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingPrompt(null);
                      form.reset();
                    }}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
