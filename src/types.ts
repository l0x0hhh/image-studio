export type Theme = "dark" | "light";
export type CreationMode = "text" | "image";
export type View = "create" | "works" | "history";
export type Ratio = "1:1" | "3:2" | "2:3" | "16:9" | "9:16";

export interface ModelInfo {
  id: string;
  owned_by?: string;
}

export interface Artwork {
  id: string;
  url: string;
  prompt: string;
  model: string;
  ratio: Ratio;
  createdAt: number;
  demo?: boolean;
}

export interface ApiConnection {
  baseUrl: string;
  apiKey: string;
}

export interface StudioSettings {
  defaultModel: string;
  optimizerModel: string;
  quality: "auto" | "high" | "medium" | "low";
  responseFormat: "auto" | "url" | "b64_json";
}

export interface GeneratePayload {
  prompt: string;
  model: string;
  n: number;
  size: string;
  quality: string;
  responseFormat: string;
  seed?: number;
  mode: CreationMode;
  referenceImages?: string[];
}
