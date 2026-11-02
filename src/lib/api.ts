import type { ApiConnection, GeneratePayload, ModelInfo } from "../types";

interface ApiErrorShape { error?: string | { message?: string }; message?: string }

function endpoint(baseUrl: string, path: string) {
  const base = baseUrl.trim().replace(/\/+$/, "").replace(/\/images\/(generations|edits)$/i, "").replace(/\/chat\/completions$/i, "");
  if (!base) throw new Error("请先填写 Base URL");
  return `${base}${path}`;
}

function headers(connection: ApiConnection, json = false): HeadersInit {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : {}),
  };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, credentials: "omit", referrerPolicy: "no-referrer" });
  } catch {
    throw new Error("无法连接中转站，请检查 Base URL、网络或对方 CORS 设置");
  }
  const raw = await response.text();
  let data: unknown = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  if (!response.ok) {
    const shape = data as ApiErrorShape;
    const error = typeof shape.error === "string" ? shape.error : shape.error?.message || shape.message;
    throw new Error(error || `请求失败（HTTP ${response.status}）`);
  }
  return data as T;
}

export async function fetchModels(connection: ApiConnection): Promise<ModelInfo[]> {
  const data = await request<{ data?: ModelInfo[]; models?: ModelInfo[] } | ModelInfo[]>(endpoint(connection.baseUrl, "/models"), { headers: headers(connection) });
  if (Array.isArray(data)) return data;
  return data.data || data.models || [];
}

export async function optimizePrompt(prompt: string, model: string | undefined, connection: ApiConnection) {
  const data = await request<{ choices?: { message?: { content?: string } }[] }>(endpoint(connection.baseUrl, "/chat/completions"), {
    method: "POST",
    headers: headers(connection, true),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "你是专业的 AI 绘图提示词设计师。保留用户的原始主体、核心意图和画面比例，动态补充合适的构图、光线、色彩与材质细节。只输出优化后的提示词，不要解释、标题、引号或 Markdown。中文输入使用中文输出，控制在 250 字以内。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  const optimized = data.choices?.[0]?.message?.content?.trim();
  if (!optimized) throw new Error("模型没有返回可用的提示词");
  return { prompt: optimized, model: model || "" };
}

function imageURL(item: unknown): string {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return "";
  const record = item as Record<string, unknown>;
  const direct = record.url || record.image_url;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object" && typeof (direct as Record<string, unknown>).url === "string") return (direct as Record<string, string>).url;
  const base64 = record.b64_json || record.base64;
  if (typeof base64 === "string") return `data:image/png;base64,${base64}`;
  return "";
}

export async function generateImages(payload: GeneratePayload, connection: ApiConnection): Promise<string[]> {
  const editing = payload.mode === "image" && Boolean(payload.referenceImages?.length);
  let body: BodyInit;
  let requestHeaders = headers(connection);
  const parameters: Record<string, string | number> = { prompt: payload.prompt, model: payload.model, n: payload.n, size: payload.size };
  if (payload.quality !== "auto") parameters.quality = payload.quality;
  if (payload.responseFormat !== "auto") parameters.response_format = payload.responseFormat;
  if (payload.seed !== undefined) parameters.seed = payload.seed;

  if (editing) {
    const form = new FormData();
    Object.entries(parameters).forEach(([key, value]) => form.append(key, String(value)));
    for (const [index, dataURL] of (payload.referenceImages || []).entries()) {
      const blob = await (await fetch(dataURL)).blob();
      form.append("image[]", blob, `reference-${index + 1}.png`);
    }
    body = form;
  } else {
    body = JSON.stringify(parameters);
    requestHeaders = headers(connection, true);
  }

  const data = await request<{ data?: unknown[]; images?: unknown[] }>(endpoint(connection.baseUrl, editing ? "/images/edits" : "/images/generations"), { method: "POST", headers: requestHeaders, body });
  const images = (data.data || data.images || []).map(imageURL).filter(Boolean);
  if (!images.length) throw new Error("生成成功，但响应中没有可显示的图片");
  return images;
}
