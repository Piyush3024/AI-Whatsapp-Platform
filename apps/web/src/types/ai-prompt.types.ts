export interface AiPrompt {
  id: string;
  persona: string;
  systemPrompt: string;
  language: string;
  isActive: boolean;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertAiPromptDto {
  persona: string;
  systemPrompt: string;
  language?: string;
  isActive?: boolean;
}

export const SUPPORTED_LANGUAGES: { code: string; label: string }[] = [
  { code: "auto", label: "Default (Auto-detect fallback)" },
  { code: "en", label: "English" },
  { code: "ne", label: "Nepali (नेपाली)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "zh", label: "Chinese (中文)" },
  { code: "ar", label: "Arabic (العربية)" },
  { code: "es", label: "Spanish (Español)" },
  { code: "fr", label: "French (Français)" },
  { code: "de", label: "German (Deutsch)" },
  { code: "pt", label: "Portuguese (Português)" },
  { code: "bn", label: "Bengali (বাংলা)" },
];
