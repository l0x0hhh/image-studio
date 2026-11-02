import { AnimatePresence, motion } from "motion/react";
import { Aperture, CheckCircle2, ChevronRight, CircleHelp, Clock3, Grid2X2, ImagePlus, Moon, Plus, Settings2, ShieldCheck, Sparkles, Sun, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Gallery } from "./components/Gallery";
import { isImageModel } from "./components/ModelPicker";
import { PromptComposer, type ReferenceImage } from "./components/PromptComposer";
import { SettingsDialog } from "./components/SettingsDialog";
import { SettingsPanel } from "./components/SettingsPanel";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { fetchModels, generateImages, optimizePrompt } from "./lib/api";
import type { ApiConnection, Artwork, CreationMode, ModelInfo, Ratio, StudioSettings, Theme, View } from "./types";

const defaultSettings: StudioSettings = { defaultModel: "qwen-image-3.0", optimizerModel: "kimi/kimi-k3.1-pro", quality: "auto", responseFormat: "auto" };
const defaultConnection: ApiConnection = { baseUrl: "", apiKey: "" };
const defaultModels: ModelInfo[] = [
  "qwen-image-2.0", "qwen-image-3.0", "qwen-image-3.0-pro", "deepseek-v4-pro-0813", "deepseek-v4.1-flash-1017", "glm-5.3", "kimi/kimi-k3", "kimi/kimi-k3.1-pro", "kimi/kimi-k3.1-pro-highspeed", "MiniMax/MiniMax-M3.1-Flash", "ZHIPU/GLM-5.3", "ZHIPU/GLM-5.3-Flash",
].map(id => ({ id }));
const demos: Artwork[] = [
  { id: "demo-1", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=85", prompt: "未来城市的雨夜，霓虹灯光与湿润街道，电影感构图", model: "NEON DREAMS", ratio: "3:2", createdAt: 0, demo: true },
  { id: "demo-2", url: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1000&q=85", prompt: "沉浸式的光影艺术空间，柔和色彩，超现实体验", model: "LIGHT & SPACE", ratio: "3:2", createdAt: 0, demo: true },
  { id: "demo-3", url: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1000&q=85", prompt: "极简室内静物，自然光线，舒适而温暖的生活美学", model: "QUIET LIVING", ratio: "3:2", createdAt: 0, demo: true },
  { id: "demo-4", url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1000&q=85", prompt: "夜幕下的城市天际线，蓝紫色调，广阔而宁静", model: "CITY SCAPES", ratio: "3:2", createdAt: 0, demo: true },
];
const initialArtwork: Artwork = { id: "qwen-sample", url: "/images/muse-sample.png", prompt: "一张柔和、简约、现代的 16:9 产品插画。", model: "qwen-image-3.0", ratio: "16:9", createdAt: Date.now() };
const ratioOrder: Ratio[] = ["1:1", "3:2", "2:3", "16:9", "9:16"];
const suggestions = [
  ["电影感人像", "雨后未来都市，霓虹灯倒映在湿润的街道上，孤独旅人背影，蓝紫色调，电影感摄影，35mm 镜头"],
  ["极简产品", "一瓶透明香水置于浅色天然石材上，柔和晨光，极简构图，高级产品广告摄影，细腻真实"],
  ["微缩世界", "微缩世界中的温馨咖啡馆，小巧人物在书本和茶杯间生活，移轴摄影，柔和暖光，丰富细节"],
  ["东方美学", "云雾缭绕的东方山水庭院，宋代美学，留白构图，晨雾与暖光交织，宁静雅致，超高清"],
];

function sizeFor(model: string, ratio: Ratio) {
  if (/qwen-image/i.test(model)) return ({ "1:1": "1328x1328", "3:2": "1536x1024", "2:3": "1024x1536", "16:9": "1664x928", "9:16": "928x1664" } as Record<Ratio, string>)[ratio];
  if (/dall-e-3/i.test(model)) return ratio === "1:1" ? "1024x1024" : ["3:2", "16:9"].includes(ratio) ? "1792x1024" : "1024x1792";
  return ({ "1:1": "1024x1024", "3:2": "1536x1024", "2:3": "1024x1536", "16:9": "1536x1024", "9:16": "1024x1536" } as Record<Ratio, string>)[ratio];
}

interface ToastMessage { id: number; text: string; error?: boolean }

function savedConnection(): ApiConnection {
  try {
    const saved = JSON.parse(localStorage.getItem("muse-connection-v2") || "{}") as Partial<ApiConnection>;
    return { baseUrl: saved.baseUrl || "", apiKey: saved.apiKey || sessionStorage.getItem("muse-session-key") || "" };
  } catch { return defaultConnection; }
}

function hasRememberedKey() {
  try { return Boolean((JSON.parse(localStorage.getItem("muse-connection-v2") || "{}") as Partial<ApiConnection>).apiKey); } catch { return false; }
}

export default function App() {
  const [theme, setTheme] = useLocalStorage<Theme>("muse-theme", "dark");
  const [settings, setSettings] = useLocalStorage<StudioSettings>("muse-settings-v2", defaultSettings);
  const [connection, setConnection] = useState<ApiConnection>(savedConnection);
  const [rememberKey, setRememberKey] = useState(hasRememberedKey);
  const [models, setModels] = useLocalStorage<ModelInfo[]>("muse-models-v2", defaultModels);
  const [model, setModel] = useState(settings.defaultModel);
  const [prompt, setPrompt] = useState(initialArtwork.prompt);
  const [mode, setMode] = useState<CreationMode>("text");
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [count, setCount] = useState(1);
  const [seed, setSeed] = useState("");
  const [view, setView] = useState<View>("create");
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([initialArtwork]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState(`已缓存 ${models.length} 个模型，可刷新更新`);
  const [connected, setConnected] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem("muse-connection-v2", JSON.stringify({ baseUrl: connection.baseUrl, ...(rememberKey ? { apiKey: connection.apiKey } : {}) }));
      if (rememberKey) sessionStorage.removeItem("muse-session-key");
      else if (connection.apiKey) sessionStorage.setItem("muse-session-key", connection.apiKey);
      else sessionStorage.removeItem("muse-session-key");
    } catch { /* Private browsing may disable storage; in-memory configuration still works. */ }
  }, [connection, rememberKey]);
  const notify = useCallback((text: string, error = false) => {
    const id = Date.now() + Math.random();
    setToasts(current => [...current, { id, text, error }]);
    window.setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), error ? 6000 : 3500);
  }, []);

  const loadModels = useCallback(async (override?: ApiConnection) => {
    const config = override || connection;
    if (!config.baseUrl.trim() || !config.apiKey.trim()) {
      setConnected(false);
      setModelStatus("请先在服务设置中填写你的 Base URL 和 API Key");
      return;
    }
    setModelLoading(true);
    setModelStatus("正在从你的中转站拉取模型…");
    try {
      const result = await fetchModels(config);
      if (!result.length) throw new Error("模型列表为空");
      const sorted = [...result].sort((a, b) => Number(isImageModel(b.id)) - Number(isImageModel(a.id)) || a.id.localeCompare(b.id));
      setModels(sorted);
      setModelStatus(`已拉取 ${sorted.length} 个模型`);
      setConnected(true);
      notify(`已拉取 ${sorted.length} 个可用模型`);
    } catch (error) {
      setConnected(false);
      setModelStatus(`拉取失败：${error instanceof Error ? error.message : "请检查服务配置"}`);
      notify(error instanceof Error ? error.message : "模型服务连接失败", true);
    } finally { setModelLoading(false); }
  }, [connection, notify, setModels]);

  useEffect(() => { void loadModels(); }, [loadModels]);

  const visibleItems = useMemo(() => view === "create" ? [...artworks, ...demos] : artworks, [view, artworks]);
  const createdCount = artworks.length;

  async function handleGenerate() {
    if (!prompt.trim()) return notify("先描述一下你想创作的画面", true);
    if (mode === "image" && !references.length) return notify("参考图创作需要先添加图片", true);
    if (!connection.baseUrl.trim() || !connection.apiKey.trim()) { setSettingsOpen(true); return notify("请先填写你自己的 Base URL 和 API Key", true); }
    setGenerating(true);
    setView("create");
    try {
      const urls = await generateImages({ prompt: prompt.trim(), model, n: count, size: sizeFor(model, ratio), quality: settings.quality, responseFormat: settings.responseFormat, seed: seed ? Number(seed) : undefined, mode, referenceImages: references.map(item => item.dataURL) }, connection);
      const created = urls.map((url, index): Artwork => ({ id: `${Date.now()}-${index}`, url, prompt: prompt.trim(), model, ratio, createdAt: Date.now() }));
      setArtworks(current => [...created, ...current]);
      notify(`创作完成，已生成 ${created.length} 张作品`);
    } catch (error) { notify(error instanceof Error ? error.message : "生成失败", true); }
    finally { setGenerating(false); }
  }

  async function handleOptimize() {
    if (!prompt.trim()) return notify("先写下一句画面描述，再让 AI 优化", true);
    if (!connection.baseUrl.trim() || !connection.apiKey.trim()) { setSettingsOpen(true); return notify("请先填写你自己的 Base URL 和 API Key", true); }
    setOptimizing(true);
    try {
      const result = await optimizePrompt(prompt.trim(), settings.optimizerModel, connection);
      setPrompt(result.prompt.slice(0, 2000));
      notify(`已使用 ${result.model} 动态优化描述`);
    } catch (error) { notify(error instanceof Error ? error.message : "优化失败", true); }
    finally { setOptimizing(false); }
  }

  function resetCreation() {
    setPrompt(""); setReferences([]); setMode("text"); setView("create");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={event => { event.preventDefault(); setView("create"); }}><span className="brand-mark"><span /><span /><span /><span /></span><span className="brand-name">MUSE<span>AI STUDIO</span></span></a>
        <motion.button className="new-creation" onClick={resetCreation} whileTap={{ scale: 0.96 }}><Plus size={18} />新建创作<kbd>⌘ N</kbd></motion.button>
        <nav className="main-nav"><p className="nav-label">工作空间</p>
          <button className={`nav-item ${view === "create" ? "active" : ""}`} onClick={() => setView("create")}><Sparkles size={19} />灵感创作{view === "create" && <motion.span layoutId="nav-dot" className="nav-dot" />}</button>
          <button className={`nav-item ${view === "works" ? "active" : ""}`} onClick={() => setView("works")}><Grid2X2 size={19} />我的作品<span className="nav-count">{createdCount}</span></button>
          <button className={`nav-item ${view === "history" ? "active" : ""}`} onClick={() => setView("history")}><Clock3 size={19} />生成记录</button>
        </nav>
        <div className="sidebar-collection"><p className="nav-label">精选灵感</p>{demos.slice(0, 2).map((item, index) => <button className="collection-card" key={item.id} onClick={() => { setPrompt(item.prompt); setView("create"); }}><img src={item.url} alt="灵感" /><span><strong>{index ? "静物美学" : "城市幻境"}</strong><small>{index ? "8" : "12"} 个灵感</small></span><ChevronRight size={14} /></button>)}</div>
        <div className="sidebar-bottom"><div className="local-badge"><span />React · BYOK 工作区</div><button className="profile-button" onClick={() => setSettingsOpen(true)}><span className="avatar">M</span><span><strong>我的创作空间</strong><small>Serverless Studio</small></span><Settings2 size={14} /></button></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb"><span>工作空间</span><ChevronRight size={12} /><strong>{view === "create" ? "灵感创作" : view === "works" ? "我的作品" : "生成记录"}</strong></div><div className="topbar-actions"><span className={`connection-pill ${connected ? "connected" : ""}`}><i /><span>{connected ? "中转站已连接" : "请配置你的接口"}</span></span><button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="切换主题">{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button><button className="icon-button" onClick={() => notify("快捷键：Ctrl / ⌘ + Enter 生成，Ctrl / ⌘ + N 新建创作")} aria-label="使用帮助"><CircleHelp size={17} /></button><button className="settings-button" onClick={() => setSettingsOpen(true)}><Settings2 size={16} />服务设置</button></div></header>
        <div className={`workspace ${view !== "create" ? "gallery-workspace" : ""}`}>
          <section className="creation-area">
            {view === "create" && <>
              <motion.div className="page-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="eyebrow"><span />CREATE WITHOUT LIMITS</div><h1>把想象，变成画面<span>。</span></h1><p>无需切换工具，让你的下一次灵感在这里发生。</p></motion.div>
              <PromptComposer prompt={prompt} mode={mode} model={model} ratio={ratio} count={count} references={references} optimizing={optimizing} generating={generating} onPromptChange={setPrompt} onModeChange={setMode} onReferencesChange={setReferences} onOptimize={() => void handleOptimize()} onGenerate={() => void handleGenerate()} onCycleRatio={() => setRatio(ratioOrder[(ratioOrder.indexOf(ratio) + 1) % ratioOrder.length])} onCycleCount={() => setCount(count % 4 + 1)} />
              <div className="prompt-suggestions"><span>试试这些灵感</span>{suggestions.map(([label, text]) => <button key={label} onClick={() => setPrompt(text)}>{label}</button>)}</div>
            </>}
            <Gallery items={visibleItems} loading={generating} loadingCount={count} favorites={favorites} onFavorite={id => setFavorites(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; })} onClear={() => { if (window.confirm("确定清空本次会话生成的作品吗？")) setArtworks([]); }} />
          </section>
          {view === "create" && <SettingsPanel models={models} settings={settings} model={model} ratio={ratio} count={count} seed={seed} modelLoading={modelLoading} modelStatus={modelStatus} sizeLabel={sizeFor(model, ratio).replace("x", " × ")} onModelChange={setModel} onRatioChange={setRatio} onCountChange={setCount} onSeedChange={setSeed} onQualityChange={quality => setSettings({ ...settings, quality })} onRefreshModels={() => void loadModels()} onOpenSettings={() => setSettingsOpen(true)} onReset={() => { setModel(settings.defaultModel); setRatio("16:9"); setCount(1); setSeed(""); setSettings({ ...settings, quality: "auto" }); notify("生成参数已重置"); }} />}
        </div>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} connection={connection} rememberKey={rememberKey} models={models} loading={modelLoading} status={modelStatus} onTest={config => void loadModels(config)} onSave={(next, nextConnection, remember) => { setSettings(next); setModel(next.defaultModel); setConnection({ baseUrl: nextConnection.baseUrl.trim(), apiKey: nextConnection.apiKey.trim() }); setRememberKey(remember); notify("接口设置已保存"); }} />
      <div className="toast-container" aria-live="polite"><AnimatePresence>{toasts.map(toast => <motion.div key={toast.id} className={`toast ${toast.error ? "error" : ""}`} initial={{ opacity: 0, x: 30, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>{toast.error ? <X size={14} /> : <CheckCircle2 size={14} />}{toast.text}</motion.div>)}</AnimatePresence></div>
      <button className="mobile-create" onClick={resetCreation} aria-label="新建创作"><ImagePlus size={20} /></button>
      <div className="security-watermark" aria-hidden="true"><ShieldCheck size={12} />BYOK · BROWSER DIRECT</div>
      <Aperture className="ambient-orb orb-one" aria-hidden="true" /><Aperture className="ambient-orb orb-two" aria-hidden="true" />
    </div>
  );
}
