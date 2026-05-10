/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_YASLI_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
