/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FRUITFY_PRODUCT_ID?: string;
  /** Opcional: URL base da API (ex.: outro domínio). Em branco = mesmo host (/api/...). */
  readonly VITE_PIX_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
