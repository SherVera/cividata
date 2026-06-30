/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_VOICE_PARSE_API_URL?: string;
  readonly VITE_VOICE_PARSE_MIN_CHARS?: string;
  readonly VITE_VOICE_PARSE_MAX_CHARS?: string;
  readonly VITE_SPEECH_RECOGNITION_LANG?: string;
  readonly VITE_SPEECH_MAX_SECONDS?: string;
  readonly VITE_VOICE_PARSE_PREFER_LOCAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
