(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = "muse-api-settings-v1";
  const MODEL_CACHE_KEY = "muse-model-cache-v1";
  const THEME_KEY = "muse-theme-v1";
  const DEFAULT_BASE_URL = "https://test.token.xhalo.com.cn/v1";
  const DEFAULT_MODEL = "qwen-image-3.0";
  const DEFAULT_PROMPT = "一张柔和、简约、现代的 16:9 产品插画。";
  const ratioSizes = {
    "1:1": "1024x1024",
    "3:2": "1536x1024",
    "2:3": "1024x1536",
    "16:9": "1536x1024",
    "9:16": "1024x1536"
  };

  const demos = [
    {
      id: "demo-1",
      url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=85",
      prompt: "未来城市的雨夜，霓虹灯光与湿润街道，电影感构图",
      model: "NEON DREAMS",
      ratio: "3:2",
      demo: true
    },
    {
      id: "demo-2",
      url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1000&q=85",
      prompt: "沉浸式的光影艺术空间，柔和色彩，超现实体验",
      model: "LIGHT & SPACE",
      ratio: "3:2",
      demo: true
    },
    {
      id: "demo-3",
      url: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1000&q=85",
      prompt: "极简室内静物，自然光线，舒适而温暖的生活美学",
      model: "QUIET LIVING",
      ratio: "3:2",
      demo: true
    },
    {
      id: "demo-4",
      url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1000&q=85",
      prompt: "夜幕下的城市天际线，蓝紫色调，广阔而宁静",
      model: "CITY SCAPES",
      ratio: "3:2",
      demo: true
    }
  ];

  const state = {
    mode: "text",
    ratio: "16:9",
    count: 1,
    generating: false,
    references: [],
    generated: [{
      id: "qwen-initial-20261101",
      url: "qwen-product-illustration-20261101-010510.png",
      prompt: DEFAULT_PROMPT,
      model: DEFAULT_MODEL,
      ratio: "16:9",
      demo: false,
      createdAt: Date.now()
    }],
    favorites: new Set(),
    view: "create",
    filter: "all",
    modelImageOnly: true,
    modelSearch: "",
    settingsModelSearch: "",
    lightboxItem: null
  };

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>'"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function safeImageURL(value) {
    if (typeof value !== "string") return "";
    const url = value.trim();
    if (/^(https?:\/\/|data:image\/|blob:)/i.test(url)) return url;
    return /^[\w./-]+\.(?:png|jpe?g|webp|gif)$/i.test(url) ? url : "";
  }

  function applyTheme(theme, persist = true) {
    const nextTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    if (persist) {
      try { localStorage.setItem(THEME_KEY, nextTheme); } catch { /* Theme persistence is optional. */ }
    }
    const light = nextTheme === "light";
    $("#themeIcon").innerHTML = light
      ? '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>'
      : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
    const label = light ? "切换到深色模式" : "切换到浅色模式";
    $("#themeToggleBtn").setAttribute("aria-label", label);
    $("#themeToggleBtn").title = label;
  }

  function getSavedSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    updateConnectionUI(settings);
  }

  function updateConnectionUI(settings = getSavedSettings()) {
    const baseUrl = settings.baseUrl || DEFAULT_BASE_URL;
    const configured = Boolean(baseUrl && settings.apiKey);
    const pill = $("#connectionPill");
    pill.classList.toggle("connected", configured);
    $("span", pill).textContent = configured ? "API 已配置" : "待填写 API Key";
    $("#apiSummaryTitle").textContent = configured ? "图像服务已连接" : "Qwen 接口已预置";
    $("#apiSummaryText").textContent = configured ? baseUrl : "填写 Key 后即可开始创作";
    const model = settings.defaultModel || DEFAULT_MODEL;
    if (!$("#modelInput").matches(":focus")) {
      $("#modelInput").value = model;
      $("#activeModelLabel").textContent = model;
    }
  }

  function toast(message, type = "success", duration = 3500) {
    const element = document.createElement("div");
    element.className = `toast ${type}`;
    element.textContent = message;
    $("#toastContainer").append(element);
    setTimeout(() => element.remove(), duration);
  }

  function openModal(id) {
    const modal = $("#" + id);
    if (!modal) return;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    if (id === "settingsModal") fillSettingsForm();
    setTimeout(() => $("input, select, button", modal)?.focus(), 30);
  }

  function closeModal(id) {
    if (id === "settingsModal") closeSettingsModelMenu();
    $("#" + id)?.classList.add("hidden");
    if (!$(".modal-backdrop:not(.hidden)") && $("#lightbox").classList.contains("hidden")) {
      document.body.style.overflow = "";
    }
  }

  function fillSettingsForm() {
    const settings = getSavedSettings();
    $("#apiType").value = settings.apiType || "images";
    $("#baseUrlInput").value = settings.baseUrl || DEFAULT_BASE_URL;
    $("#apiKeyInput").value = settings.apiKey || "";
    $("#defaultModelInput").value = settings.defaultModel || $("#modelInput").value || DEFAULT_MODEL;
    $("#responseFormatSelect").value = settings.responseFormat || "auto";
    $("#extraParamsInput").value = settings.extraParams || "";
    updateAPITypeHint();
    $("#connectionTest").className = "connection-test hidden";
  }

  function updateAPITypeHint() {
    $("#apiTypeHint").textContent = $("#apiType").value === "images"
      ? "适用于 gpt-image、DALL·E、Seedream 等 /images/generations 接口"
      : "适用于通过 /chat/completions 返回图片的 Gemini、即梦或其他图像模型";
  }

  function validateExtraParams(raw) {
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("高级参数必须是 JSON 对象");
    }
    return parsed;
  }

  function currentSettings() {
    const saved = getSavedSettings();
    return {
      apiType: saved.apiType || "images",
      baseUrl: (saved.baseUrl || DEFAULT_BASE_URL).trim(),
      apiKey: (saved.apiKey || "").trim(),
      defaultModel: $("#modelInput").value.trim() || saved.defaultModel || DEFAULT_MODEL,
      responseFormat: saved.responseFormat || "auto",
      extraParams: saved.extraParams || ""
    };
  }

  function setRatio(ratio) {
    state.ratio = ratio;
    $$("#ratioGrid button").forEach(button => button.classList.toggle("active", button.dataset.ratio === ratio));
    const size = getSizeForModel(ratio, $("#modelInput").value);
    $("#ratioSizeLabel").textContent = size.replace("x", " × ");
    $("#quickRatio span").textContent = ratio;
  }

  function setCount(value) {
    state.count = Math.max(1, Math.min(4, Number(value) || 1));
    $("#countInput").value = state.count;
    $("#countValue").textContent = `${state.count} 张`;
    $("#quickCount span").textContent = `${state.count} 张`;
  }

  function getSizeForModel(ratio, model) {
    if (/qwen-image/i.test(model)) {
      const qwenSizes = {
        "1:1": "1328x1328",
        "3:2": "1536x1024",
        "2:3": "1024x1536",
        "16:9": "1664x928",
        "9:16": "928x1664"
      };
      return qwenSizes[ratio] || qwenSizes["16:9"];
    }
    if (/dall-e-3/i.test(model)) {
      if (["3:2", "16:9"].includes(ratio)) return "1792x1024";
      if (["2:3", "9:16"].includes(ratio)) return "1024x1792";
      return "1024x1024";
    }
    return ratioSizes[ratio] || ratioSizes["1:1"];
  }

  function usePrompt(prompt) {
    switchView("create");
    $("#promptInput").value = prompt;
    $("#charCount").textContent = prompt.length;
    $("#promptInput").focus();
    $("#composer").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function switchView(view) {
    state.view = view;
    $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));
    const titles = { create: "灵感创作", works: "我的作品", history: "生成记录" };
    $("#breadcrumbCurrent").textContent = titles[view];
    const isCreate = view === "create";
    $("#pageHeading").classList.toggle("hidden", !isCreate);
    $("#composer").classList.toggle("hidden", !isCreate);
    $("#promptSuggestions").classList.toggle("hidden", !isCreate);
    $(".settings-panel").classList.toggle("view-hidden", !isCreate);
    $("#gallerySection").style.marginTop = isCreate ? "" : "12px";
    renderGallery();
  }

  function visibleItems() {
    let items;
    if (state.view === "create") items = [...state.generated, ...demos];
    else items = [...state.generated];
    if (state.filter === "recent") items = items.filter(item => !item.demo);
    if (state.filter === "favorites") items = items.filter(item => state.favorites.has(item.id));
    return items;
  }

  function renderGallery() {
    const items = visibleItems();
    const titles = {
      create: state.generated.length ? "最近创作" : "灵感精选",
      works: "我的作品",
      history: "生成记录"
    };
    $("#galleryTitle").textContent = titles[state.view];
    $("#galleryBadge").textContent = state.view === "create" && !state.generated.length ? "为你推荐" : `${items.length} 个画面`;
    $("#galleryBadge").classList.toggle("hidden", state.view === "create" && !state.generated.length ? false : items.length === 0);
    $("#clearGalleryBtn").classList.toggle("hidden", state.generated.length === 0);
    $("#worksCount").textContent = state.generated.length;
    $("#emptyState").classList.toggle("hidden", items.length > 0);
    $("#galleryGrid").classList.toggle("hidden", items.length === 0);
    $("#galleryGrid").innerHTML = items.map((item, index) => artCardTemplate(item, index)).join("");
  }

  function artCardTemplate(item, index) {
    const favorite = state.favorites.has(item.id);
    const url = safeImageURL(item.url);
    return `
      <article class="art-card" data-id="${escapeHTML(item.id)}" style="animation-delay:${Math.min(index * 55, 220)}ms">
        <div class="art-image-wrap" data-action="preview">
          <img src="${escapeHTML(url)}" alt="${escapeHTML(item.prompt)}" loading="lazy">
          <div class="art-gradient"></div>
          ${item.demo ? '<span class="demo-tag">EDITOR’S PICK</span>' : ""}
          <div class="art-hover-actions">
            <button data-action="favorite" class="${favorite ? "favorite" : ""}" title="${favorite ? "取消收藏" : "收藏"}" aria-label="收藏">
              <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>
            </button>
            <button data-action="download" title="下载" aria-label="下载"><svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/></svg></button>
          </div>
        </div>
        <div class="art-info">
          <p class="art-prompt" title="${escapeHTML(item.prompt)}">${escapeHTML(item.prompt)}</p>
          <div class="art-meta"><span><i></i>${escapeHTML(item.model)}</span><span>${escapeHTML(item.ratio)}${item.demo ? "" : " · 刚刚"}</span></div>
        </div>
      </article>`;
  }

  function showLoadingCards() {
    $("#emptyState").classList.add("hidden");
    $("#galleryGrid").classList.remove("hidden");
    $("#galleryTitle").textContent = "正在生成画面";
    $("#galleryBadge").textContent = "请稍候";
    $("#galleryBadge").classList.remove("hidden");
    $("#galleryGrid").innerHTML = Array.from({ length: state.count }, () => `
      <article class="art-card skeleton-card">
        <div class="art-image-wrap"><span class="loading-orbit"></span></div>
        <div class="art-info"><div class="loading-line"></div><span>模型正在理解你的灵感…</span></div>
      </article>`).join("");
  }

  function findItem(id) {
    return [...state.generated, ...demos].find(item => item.id === id);
  }

  function openLightbox(item) {
    if (!item) return;
    state.lightboxItem = item;
    $("#lightboxImage").src = safeImageURL(item.url);
    $("#lightboxImage").alt = item.prompt;
    $("#lightboxPrompt").textContent = item.prompt;
    $("#lightboxDownload").href = safeImageURL(item.url);
    $("#lightboxDownload").download = `muse-${Date.now()}.png`;
    $("#lightbox").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    $("#lightbox").classList.add("hidden");
    $("#lightboxImage").src = "";
    document.body.style.overflow = "";
  }

  async function downloadImage(item) {
    if (!item) return;
    const url = safeImageURL(item.url);
    if (!url) return toast("图片地址不可用", "error");
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("download failed");
      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectURL;
      link.download = `muse-${Date.now()}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
    } catch {
      const link = document.createElement("a");
      link.href = url;
      link.download = `muse-${Date.now()}.png`;
      link.target = "_blank";
      link.rel = "noopener";
      link.click();
    }
  }

  function buildEndpoint(baseUrl, type, editing = false) {
    const base = baseUrl.trim().replace(/\/+$/, "");
    if (type === "chat") {
      return /\/chat\/completions$/i.test(base) ? base : `${base}/chat/completions`;
    }
    if (editing) {
      if (/\/images\/generations$/i.test(base)) return base.replace(/generations$/i, "edits");
      return /\/images\/edits$/i.test(base) ? base : `${base}/images/edits`;
    }
    return /\/images\/generations$/i.test(base) ? base : `${base}/images/generations`;
  }

  function authHeaders(apiKey) {
    return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  }

  function normalizedQuality(model, quality) {
    if (quality === "auto") return null;
    if (/dall-e-3/i.test(model)) return quality === "high" ? "hd" : "standard";
    return quality;
  }

  async function requestGeneration(settings, prompt) {
    const editing = state.mode === "image" && state.references.length > 0;
    const extra = validateExtraParams(settings.extraParams);
    const model = settings.defaultModel;
    const endpoint = buildEndpoint(settings.baseUrl, settings.apiType, editing);
    let response;

    if (settings.apiType === "chat") {
      const content = editing
        ? [
            { type: "text", text: prompt },
            ...state.references.map(file => ({ type: "image_url", image_url: { url: file.dataURL } }))
          ]
        : prompt;
      const payload = {
        model,
        messages: [{ role: "user", content }],
        ...extra
      };
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(settings.apiKey) },
        body: JSON.stringify(payload)
      });
    } else if (editing) {
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", prompt);
      form.append("n", String(state.count));
      form.append("size", getSizeForModel(state.ratio, model));
      const quality = normalizedQuality(model, $("#qualitySelect").value);
      if (quality) form.append("quality", quality);
      if (settings.responseFormat !== "auto") form.append("response_format", settings.responseFormat);
      if ($("#seedInput").value !== "") form.append("seed", $("#seedInput").value);
      state.references.forEach((file, index) => form.append("image[]", file.file, file.file.name || `reference-${index}.png`));
      Object.entries(extra).forEach(([key, value]) => {
        form.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      });
      response = await fetch(endpoint, { method: "POST", headers: authHeaders(settings.apiKey), body: form });
    } else {
      const payload = {
        model,
        prompt,
        n: state.count,
        size: getSizeForModel(state.ratio, model),
        ...extra
      };
      const quality = normalizedQuality(model, $("#qualitySelect").value);
      if (quality && payload.quality === undefined) payload.quality = quality;
      if (settings.responseFormat !== "auto" && payload.response_format === undefined) {
        payload.response_format = settings.responseFormat;
      }
      if ($("#seedInput").value !== "" && payload.seed === undefined) payload.seed = Number($("#seedInput").value);
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(settings.apiKey) },
        body: JSON.stringify(payload)
      });
    }

    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(`接口返回了非 JSON 内容（HTTP ${response.status}）：${raw.slice(0, 120)}`);
    }
    if (!response.ok) {
      const message = data?.error?.message || data?.message || data?.error || raw.slice(0, 180) || `HTTP ${response.status}`;
      throw new Error(typeof message === "string" ? message : JSON.stringify(message));
    }
    const images = settings.apiType === "chat" ? extractChatImages(data) : extractImages(data);
    if (!images.length) throw new Error("请求成功，但没有识别到图片。请检查接口协议或高级请求参数。");
    return images;
  }

  function extractImages(data) {
    const source = data?.data || data?.images || [];
    if (!Array.isArray(source)) return [];
    return source.flatMap(item => {
      if (typeof item === "string") return [safeImageURL(item)];
      const url = safeImageURL(item?.url || item?.image_url || item?.image);
      if (url) return [url];
      const base64 = item?.b64_json || item?.base64 || item?.inline_data?.data || item?.inlineData?.data;
      if (base64) {
        const mime = item?.mime_type || item?.mimeType || item?.inline_data?.mime_type || "image/png";
        return [`data:${mime};base64,${base64.replace(/^data:image\/[^;]+;base64,/, "")}`];
      }
      return [];
    }).filter(Boolean);
  }

  function extractChatImages(data) {
    if (Array.isArray(data?.data)) return extractImages(data);
    const results = [];
    const visited = new WeakSet();

    function visit(value, depth = 0) {
      if (!value || depth > 8) return;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (safeImageURL(trimmed) && (/^data:image\//i.test(trimmed) || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(trimmed) || /^(blob:)/i.test(trimmed))) {
          results.push(safeImageURL(trimmed));
          return;
        }
        const patterns = [
          /!\[[^\]]*\]\((https?:\/\/[^)\s]+|data:image\/[^)]+)\)/gi,
          /(https?:\/\/[^\s<>"']+\.(?:png|jpe?g|webp|gif)(?:\?[^\s<>"']*)?)/gi,
          /(data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\r\n]+)/gi
        ];
        patterns.forEach(pattern => {
          for (const match of trimmed.matchAll(pattern)) results.push(safeImageURL(match[1]));
        });
        return;
      }
      if (typeof value !== "object" || visited.has(value)) return;
      visited.add(value);
      if (value.b64_json || value.inline_data?.data || value.inlineData?.data) {
        results.push(...extractImages({ data: [value] }));
        return;
      }
      if (value.image_url) {
        const url = typeof value.image_url === "string" ? value.image_url : value.image_url.url;
        if (safeImageURL(url)) results.push(safeImageURL(url));
      }
      if (value.url && safeImageURL(value.url)) results.push(safeImageURL(value.url));
      Object.values(value).forEach(child => visit(child, depth + 1));
    }

    visit(data);
    return [...new Set(results.filter(Boolean))];
  }

  async function generate() {
    if (state.generating) return;
    const prompt = $("#promptInput").value.trim();
    if (!prompt) {
      toast("先描述一下你想创作的画面吧", "error");
      $("#promptInput").focus();
      return;
    }
    const settings = currentSettings();
    if (!settings.baseUrl || !settings.apiKey) {
      openModal("settingsModal");
      toast("接口和模型已预置，请填写你的 API Key", "error");
      return;
    }
    if (state.mode === "image" && !state.references.length) {
      toast("参考图创作需要先添加至少一张图片", "error");
      return;
    }

    state.generating = true;
    const button = $("#generateBtn");
    button.disabled = true;
    button.classList.add("loading");
    $("span", button).textContent = "生成中…";
    switchView("create");
    showLoadingCards();
    $("#gallerySection").scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const urls = await requestGeneration(settings, prompt);
      const created = urls.map((url, index) => ({
        id: `created-${Date.now()}-${index}`,
        url,
        prompt,
        model: settings.defaultModel,
        ratio: state.ratio,
        demo: false,
        createdAt: Date.now()
      }));
      state.generated.unshift(...created);
      state.filter = "all";
      $("#galleryFilter").value = "all";
      renderGallery();
      toast(`创作完成，已生成 ${created.length} 张作品`);
    } catch (error) {
      console.error("Image generation failed:", error);
      renderGallery();
      const message = error instanceof TypeError
        ? "网络请求失败，请检查接口地址、网络连接或中转站 CORS 设置"
        : error.message;
      toast(message, "error", 6500);
    } finally {
      state.generating = false;
      button.disabled = false;
      button.classList.remove("loading");
      $("span", button).textContent = "开始生成";
    }
  }

  function renderModelOptions(models) {
    const options = models.map(model => `<option value="${escapeHTML(model)}"></option>`).join("");
    $("#modelOptions").innerHTML = options;
    $("#apiModelOptions").innerHTML = options;
    renderModelMenu();
    renderSettingsModelMenu();
  }

  function isImageModel(model) {
    return /image|dall|flux|seedream|imagen/i.test(model);
  }

  function renderModelMenu() {
    const models = $$("#modelOptions option").map(option => option.value);
    const query = state.modelSearch.trim().toLowerCase();
    const filtered = models.filter(model => (!state.modelImageOnly || isImageModel(model)) && (!query || model.toLowerCase().includes(query)));
    $("#modelMenuTitle").textContent = `${state.modelImageOnly ? "生图模型" : "全部模型"} · ${filtered.length}`;
    $("#modelFilterToggle").textContent = state.modelImageOnly ? "查看全部" : "只看生图";
    const selected = $("#modelInput").value;
    $("#modelMenuList").innerHTML = filtered.length ? filtered.map(model => `
      <button class="model-menu-item ${model === selected ? "selected" : ""}" type="button" data-model="${escapeHTML(model)}">
        <span>${escapeHTML(model)}</span><span class="model-type-badge">${isImageModel(model) ? "生图" : "其他"}</span>
      </button>`).join("") : '<div class="model-menu-empty">没有匹配的模型，可直接使用输入的模型 ID</div>';
  }

  function openModelMenu(clearSearch = true) {
    if (clearSearch) state.modelSearch = "";
    renderModelMenu();
    $("#modelDropdown").classList.remove("hidden");
    $("#modelDropdownBtn").setAttribute("aria-expanded", "true");
  }

  function closeModelMenu() {
    $("#modelDropdown").classList.add("hidden");
    $("#modelDropdownBtn").setAttribute("aria-expanded", "false");
  }

  function renderSettingsModelMenu() {
    const models = $$("#apiModelOptions option").map(option => option.value);
    const query = state.settingsModelSearch.trim().toLowerCase();
    const filtered = models.filter(model => !query || model.toLowerCase().includes(query));
    $("#settingsModelMenuTitle").textContent = `${query ? "匹配模型" : "全部模型"} · ${filtered.length}`;
    const selected = $("#defaultModelInput").value;
    $("#settingsModelMenuList").innerHTML = filtered.length ? filtered.map(model => `
      <button class="model-menu-item ${model === selected ? "selected" : ""}" type="button" data-settings-model="${escapeHTML(model)}">
        <span>${escapeHTML(model)}</span><span class="model-type-badge">${isImageModel(model) ? "生图" : "其他"}</span>
      </button>`).join("") : '<div class="model-menu-empty">没有匹配的模型，可直接使用输入的模型 ID</div>';
  }

  function openSettingsModelMenu(clearSearch = true) {
    if (clearSearch) state.settingsModelSearch = "";
    renderSettingsModelMenu();
    $("#settingsModelDropdown").classList.remove("hidden");
    $("#settingsModelDropdownBtn").setAttribute("aria-expanded", "true");
  }

  function closeSettingsModelMenu() {
    $("#settingsModelDropdown").classList.add("hidden");
    $("#settingsModelDropdownBtn").setAttribute("aria-expanded", "false");
  }

  function loadCachedModels() {
    try {
      const models = JSON.parse(localStorage.getItem(MODEL_CACHE_KEY) || "[]");
      if (Array.isArray(models) && models.length) {
        renderModelOptions(models);
        $("#modelFetchStatus").textContent = `已缓存 ${models.length} 个模型，可点击刷新更新`;
      }
    } catch {
      // A damaged cache should not prevent the studio from opening.
    }
  }

  async function fetchAvailableModels() {
    const modalOpen = !$("#settingsModal").classList.contains("hidden");
    const saved = currentSettings();
    const baseUrl = (modalOpen ? $("#baseUrlInput").value : saved.baseUrl).trim();
    const apiKey = (modalOpen ? $("#apiKeyInput").value : saved.apiKey).trim();
    const buttons = [$("#fetchModelsBtn"), $("#fetchModelsSettingsBtn")];
    const status = $("#modelFetchStatus");
    if (!baseUrl) {
      toast("请先填写中转站接口地址", "error");
      return;
    }

    buttons.forEach(button => {
      button.disabled = true;
      button.classList.add("loading");
    });
    status.className = "field-hint";
    status.textContent = "正在从中转站拉取模型…";

    try {
      const cleanBase = baseUrl.replace(/\/+$/, "")
        .replace(/\/images\/(generations|edits)$/i, "")
        .replace(/\/chat\/completions$/i, "");
      const response = await fetch(`${cleanBase}/models`, { headers: authHeaders(apiKey) });
      const raw = await response.text();
      let data;
      try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error("模型接口返回了非 JSON 内容"); }
      if (!response.ok) {
        const message = data?.error?.message || data?.message || `HTTP ${response.status}`;
        throw new Error(typeof message === "string" ? message : JSON.stringify(message));
      }
      const source = Array.isArray(data) ? data : data.data || data.models || [];
      if (!Array.isArray(source)) throw new Error("没有识别到模型列表");
      const models = [...new Set(source.map(item => typeof item === "string" ? item : item?.id || item?.name).filter(Boolean))]
        .sort((a, b) => {
          const imagePattern = /image|dall|flux|seedream|imagen/i;
          return Number(imagePattern.test(b)) - Number(imagePattern.test(a)) || a.localeCompare(b);
        });
      if (!models.length) throw new Error("中转站返回了空的模型列表");
      renderModelOptions(models);
      try { localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(models)); } catch { /* Cache is optional. */ }
      status.className = "field-hint success";
      status.textContent = `已拉取 ${models.length} 个模型，点击图片模型输入框选择`;
      if (modalOpen) {
        const result = $("#connectionTest");
        result.className = "connection-test success";
        result.textContent = `成功拉取 ${models.length} 个模型，可在“默认模型”输入框中搜索选择。`;
      }
      toast(`已拉取 ${models.length} 个可用模型`);
    } catch (error) {
      const message = error instanceof TypeError ? "模型拉取失败，请检查网络或 CORS 设置" : error.message;
      status.className = "field-hint error";
      status.textContent = message;
      if (modalOpen) {
        const result = $("#connectionTest");
        result.className = "connection-test error";
        result.textContent = message;
      }
      toast(message, "error", 5000);
    } finally {
      buttons.forEach(button => {
        button.disabled = false;
        button.classList.remove("loading");
      });
    }
  }

  async function testConnection() {
    const baseUrl = $("#baseUrlInput").value.trim();
    const apiKey = $("#apiKeyInput").value.trim();
    const result = $("#connectionTest");
    if (!baseUrl) {
      result.className = "connection-test error";
      result.textContent = "请先填写接口地址。";
      return;
    }
    const button = $("#testConnectionBtn");
    button.disabled = true;
    result.className = "connection-test";
    result.textContent = "正在请求模型列表，测试不会消耗图片生成额度…";
    try {
      const cleanBase = baseUrl.replace(/\/+$/, "")
        .replace(/\/images\/(generations|edits)$/i, "")
        .replace(/\/chat\/completions$/i, "");
      const response = await fetch(`${cleanBase}/models`, { headers: authHeaders(apiKey) });
      const raw = await response.text();
      let data = {};
      try { data = JSON.parse(raw); } catch { /* handled below */ }
      if (!response.ok) throw new Error(data?.error?.message || data?.message || `HTTP ${response.status}`);
      const count = Array.isArray(data?.data) ? data.data.length : 0;
      result.className = "connection-test success";
      result.textContent = count ? `连接成功，服务返回了 ${count} 个可用模型。保存后即可生成。` : "连接成功，服务响应正常。保存后即可生成。";
    } catch (error) {
      result.className = "connection-test error";
      result.textContent = `${error instanceof TypeError ? "无法连接，请检查地址或 CORS 设置" : error.message}。部分中转站不开放 /models，也可以直接保存后尝试生成。`;
    } finally {
      button.disabled = false;
    }
  }

  function handleReferences(files) {
    const valid = [...files].filter(file => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024);
    if (valid.length !== files.length) toast("已跳过非图片或超过 10MB 的文件", "error");
    const available = Math.max(0, 5 - state.references.length);
    valid.slice(0, available).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        state.references.push({ file, dataURL: reader.result, id: crypto.randomUUID?.() || String(Date.now() + Math.random()) });
        renderReferences();
      };
      reader.readAsDataURL(file);
    });
    if (valid.length > available) toast("最多添加 5 张参考图", "error");
    $("#referenceInput").value = "";
  }

  function renderReferences() {
    $("#referenceList").innerHTML = state.references.map(item => `
      <div class="reference-thumb"><img src="${item.dataURL}" alt="参考图"><button data-reference-id="${item.id}" aria-label="移除">×</button></div>`).join("");
  }

  function resetParameters() {
    setRatio("16:9");
    setCount(1);
    $("#qualitySelect").value = "auto";
    $("#seedInput").value = "";
    const settings = getSavedSettings();
    $("#modelInput").value = settings.defaultModel || DEFAULT_MODEL;
    $("#activeModelLabel").textContent = $("#modelInput").value;
    toast("生成参数已重置");
  }

  // Navigation and prompt interactions
  $$(".nav-item").forEach(item => item.addEventListener("click", () => switchView(item.dataset.view)));
  $$("[data-prompt]").forEach(button => button.addEventListener("click", () => usePrompt(button.dataset.prompt)));
  $("#newCreationBtn").addEventListener("click", () => {
    switchView("create");
    $("#promptInput").value = "";
    $("#charCount").textContent = "0";
    state.references = [];
    renderReferences();
    $("#promptInput").focus();
  });
  $("#inspirationAdd").addEventListener("click", () => usePrompt("一座隐藏在森林深处的玻璃小屋，雨后薄雾，暖色灯光，自然建筑摄影，宁静而梦幻"));
  $("#promptInput").addEventListener("input", event => { $("#charCount").textContent = event.target.value.length; });
  $("#enhancePromptBtn").addEventListener("click", () => {
    const input = $("#promptInput");
    const prompt = input.value.trim();
    if (!prompt) return toast("先写下一句画面描述，再帮你补充细节", "error");
    const suffix = "，主体清晰，构图考究，电影感光影，色彩和谐，材质细节丰富，专业艺术作品，高分辨率";
    if (!input.value.includes("主体清晰")) input.value = prompt.replace(/[，。,.]$/, "") + suffix;
    $("#charCount").textContent = input.value.length;
    toast("已补充构图、光影与细节描述");
  });
  $$(".mode-tab").forEach(tab => tab.addEventListener("click", () => {
    state.mode = tab.dataset.mode;
    $$(".mode-tab").forEach(item => item.classList.toggle("active", item === tab));
    $("#referenceZone").classList.toggle("hidden", state.mode !== "image");
    $("#promptInput").placeholder = state.mode === "image"
      ? "描述希望如何参考或修改图片，例如：保留主体，将背景替换为日落时的海边，整体呈电影胶片质感……"
      : "描述你脑海中的画面，例如：一座漂浮在云海中的东方庭院，晨光穿过薄雾，电影感光影，超细节……";
  }));
  $("#referenceInput").addEventListener("change", event => handleReferences(event.target.files));
  $("#referenceList").addEventListener("click", event => {
    const button = event.target.closest("[data-reference-id]");
    if (!button) return;
    state.references = state.references.filter(item => item.id !== button.dataset.referenceId);
    renderReferences();
  });

  // Generation parameters
  $$("#ratioGrid button").forEach(button => button.addEventListener("click", () => setRatio(button.dataset.ratio)));
  $("#quickRatio").addEventListener("click", () => {
    const ratios = Object.keys(ratioSizes);
    setRatio(ratios[(ratios.indexOf(state.ratio) + 1) % ratios.length]);
  });
  $("#countMinus").addEventListener("click", () => setCount(state.count - 1));
  $("#countPlus").addEventListener("click", () => setCount(state.count + 1));
  $("#quickCount").addEventListener("click", () => setCount(state.count % 4 + 1));
  $("#randomSeedBtn").addEventListener("click", () => { $("#seedInput").value = Math.floor(Math.random() * 2147483647); });
  $("#modelInput").addEventListener("input", event => {
    $("#activeModelLabel").textContent = event.target.value || "未选择模型";
    $("#ratioSizeLabel").textContent = getSizeForModel(state.ratio, event.target.value).replace("x", " × ");
    state.modelSearch = event.target.value;
    if ($("#modelDropdown").classList.contains("hidden")) openModelMenu(false);
    else renderModelMenu();
  });
  $("#modelInput").addEventListener("click", () => openModelMenu(true));
  $("#modelInput").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); closeModelMenu(); }
  });
  $("#modelDropdownBtn").addEventListener("click", () => {
    $("#modelDropdown").classList.contains("hidden") ? openModelMenu(true) : closeModelMenu();
  });
  $("#modelFilterToggle").addEventListener("click", () => {
    state.modelImageOnly = !state.modelImageOnly;
    renderModelMenu();
  });
  $("#modelMenuList").addEventListener("click", event => {
    const button = event.target.closest("[data-model]");
    if (!button) return;
    $("#modelInput").value = button.dataset.model;
    $("#modelInput").dispatchEvent(new Event("input", { bubbles: true }));
    closeModelMenu();
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".model-group")) closeModelMenu();
  });
  $("#resetSettingsBtn").addEventListener("click", resetParameters);
  $("#generateBtn").addEventListener("click", generate);

  // Gallery
  $("#galleryFilter").addEventListener("change", event => { state.filter = event.target.value; renderGallery(); });
  $("#clearGalleryBtn").addEventListener("click", () => {
    if (!state.generated.length) return;
    if (window.confirm("确定清空本次会话生成的作品吗？已保存到本地的图片不受影响。")) {
      state.generated = [];
      state.favorites.clear();
      renderGallery();
    }
  });
  $("#refreshGalleryBtn").addEventListener("click", () => {
    demos.push(demos.shift());
    renderGallery();
    toast("已换一组灵感排序");
  });
  $("#galleryGrid").addEventListener("click", event => {
    const card = event.target.closest(".art-card");
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!card || !action) return;
    const item = findItem(card.dataset.id);
    if (action === "favorite") {
      state.favorites.has(item.id) ? state.favorites.delete(item.id) : state.favorites.add(item.id);
      renderGallery();
      toast(state.favorites.has(item.id) ? "已加入收藏" : "已取消收藏");
    } else if (action === "download") downloadImage(item);
    else if (action === "preview") openLightbox(item);
  });

  // API settings and dialogs
  ["#openSettingsBtn", "#panelSettingsBtn", "#profileSettingsBtn"].forEach(selector => $(selector).addEventListener("click", () => openModal("settingsModal")));
  $("#themeToggleBtn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    applyTheme(next);
  });
  $("#helpBtn").addEventListener("click", () => openModal("helpModal"));
  $$("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.close)));
  $$(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("mousedown", event => {
    if (event.target === backdrop) closeModal(backdrop.id);
  }));
  $("#apiType").addEventListener("change", updateAPITypeHint);
  $("#toggleKeyBtn").addEventListener("click", () => {
    const input = $("#apiKeyInput");
    input.type = input.type === "password" ? "text" : "password";
  });
  $("#testConnectionBtn").addEventListener("click", testConnection);
  $("#fetchModelsBtn").addEventListener("click", fetchAvailableModels);
  $("#fetchModelsSettingsBtn").addEventListener("click", fetchAvailableModels);
  $("#defaultModelInput").addEventListener("click", () => openSettingsModelMenu(true));
  $("#defaultModelInput").addEventListener("input", event => {
    state.settingsModelSearch = event.target.value;
    if ($("#settingsModelDropdown").classList.contains("hidden")) openSettingsModelMenu(false);
    else renderSettingsModelMenu();
  });
  $("#defaultModelInput").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); closeSettingsModelMenu(); }
  });
  $("#settingsModelDropdownBtn").addEventListener("click", () => {
    $("#settingsModelDropdown").classList.contains("hidden") ? openSettingsModelMenu(true) : closeSettingsModelMenu();
  });
  $("#settingsModelMenuList").addEventListener("click", event => {
    const button = event.target.closest("[data-settings-model]");
    if (!button) return;
    $("#defaultModelInput").value = button.dataset.settingsModel;
    state.settingsModelSearch = "";
    closeSettingsModelMenu();
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".settings-model-field")) closeSettingsModelMenu();
  });
  $("#apiForm").addEventListener("submit", event => {
    event.preventDefault();
    const baseUrl = $("#baseUrlInput").value.trim();
    const defaultModel = $("#defaultModelInput").value.trim();
    if (!baseUrl) return toast("请填写接口地址", "error");
    if (!defaultModel) return toast("请填写默认模型 ID", "error");
    try { new URL(baseUrl); } catch { return toast("接口地址格式不正确，请包含 http:// 或 https://", "error"); }
    try { validateExtraParams($("#extraParamsInput").value); } catch (error) { return toast(error.message, "error"); }
    const settings = {
      apiType: $("#apiType").value,
      baseUrl,
      apiKey: $("#apiKeyInput").value.trim(),
      defaultModel,
      responseFormat: $("#responseFormatSelect").value,
      extraParams: $("#extraParamsInput").value.trim()
    };
    try {
      saveSettings(settings);
      closeModal("settingsModal");
      toast("连接配置已保存，可以开始创作了");
    } catch {
      toast("浏览器存储空间不足，配置保存失败", "error");
    }
  });

  // Lightbox and keyboard shortcuts
  $("#lightboxClose").addEventListener("click", closeLightbox);
  $("#lightbox").addEventListener("click", event => { if (event.target === $("#lightbox")) closeLightbox(); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModelMenu();
      closeSettingsModelMenu();
      closeLightbox();
      $$(".modal-backdrop:not(.hidden)").forEach(modal => closeModal(modal.id));
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      generate();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
      event.preventDefault();
      $("#newCreationBtn").click();
    }
  });

  applyTheme(document.documentElement.dataset.theme || "dark", false);
  updateConnectionUI();
  loadCachedModels();
  setRatio("16:9");
  setCount(1);
  $("#charCount").textContent = $("#promptInput").value.length;
  renderGallery();
})();
