import { motion } from "motion/react";
import { Boxes, RotateCcw, ShieldCheck, Shuffle } from "lucide-react";
import { ModelPicker } from "./ModelPicker";
import type { ModelInfo, Ratio, StudioSettings } from "../types";

const ratios: Ratio[] = ["1:1", "3:2", "2:3", "16:9", "9:16"];

interface SettingsPanelProps {
  models: ModelInfo[];
  settings: StudioSettings;
  model: string;
  ratio: Ratio;
  count: number;
  seed: string;
  modelLoading: boolean;
  modelStatus: string;
  sizeLabel: string;
  onModelChange: (model: string) => void;
  onRatioChange: (ratio: Ratio) => void;
  onCountChange: (count: number) => void;
  onSeedChange: (seed: string) => void;
  onQualityChange: (quality: StudioSettings["quality"]) => void;
  onRefreshModels: () => void;
  onOpenSettings: () => void;
  onReset: () => void;
}

export function SettingsPanel(props: SettingsPanelProps) {
  const { models, settings, model, ratio, count, seed, modelLoading, modelStatus, sizeLabel } = props;
  return (
    <motion.aside className="settings-panel liquid-glass" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 240, damping: 26, delay: 0.12 }}>
      <div className="panel-heading"><h2>生成设置</h2><button onClick={props.onReset} title="重置参数" aria-label="重置参数"><RotateCcw size={15} /></button></div>
      <div className="setting-group model-group">
        <label>图像模型</label>
        <ModelPicker models={models} value={model} onChange={props.onModelChange} onRefresh={props.onRefreshModels} loading={modelLoading} />
        <p className={`field-hint ${modelStatus.includes("失败") ? "error" : ""}`}>{modelStatus}</p>
      </div>
      <div className="setting-group">
        <div className="setting-label"><label>画面比例</label><span>{sizeLabel}</span></div>
        <div className="ratio-grid">
          {ratios.map(item => (
            <motion.button key={item} className={ratio === item ? "active" : ""} onClick={() => props.onRatioChange(item)} whileTap={{ scale: 0.91 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
              <span className={`ratio-shape ${item === "1:1" ? "square" : item === "3:2" ? "landscape" : item === "2:3" ? "portrait" : item === "16:9" ? "wide" : "tall"}`} /><small>{item}</small>
            </motion.button>
          ))}
        </div>
      </div>
      <div className="setting-group compact-group">
        <div className="setting-label"><label>生成数量</label></div>
        <div className="stepper"><button onClick={() => props.onCountChange(Math.max(1, count - 1))} aria-label="减少数量">−</button><input value={count} readOnly aria-label="生成数量" /><button onClick={() => props.onCountChange(Math.min(4, count + 1))} aria-label="增加数量">+</button></div>
      </div>
      <div className="setting-group compact-group">
        <label htmlFor="qualitySelect">生成质量</label>
        <select id="qualitySelect" className="standalone-select" value={settings.quality} onChange={event => props.onQualityChange(event.target.value as StudioSettings["quality"])}>
          <option value="auto">自动（推荐）</option><option value="high">高质量</option><option value="medium">均衡</option><option value="low">快速</option>
        </select>
      </div>
      <div className="setting-group compact-group">
        <label htmlFor="seedInput">随机种子 <span className="optional">可选</span></label>
        <div className="seed-input"><input id="seedInput" type="number" placeholder="留空则随机" min="0" value={seed} onChange={event => props.onSeedChange(event.target.value)} /><button title="随机种子" onClick={() => props.onSeedChange(String(Math.floor(Math.random() * 2147483647)))}><Shuffle size={14} /></button></div>
      </div>
      <div className="panel-divider" />
      <div className="api-summary"><div><span className="api-icon"><Boxes size={16} /></span><span><strong>使用你自己的接口</strong><small>Key 不经过 MUSE 服务器</small></span></div><button onClick={props.onOpenSettings}>管理</button></div>
      <p className="privacy-note"><ShieldCheck size={12} />默认仅当前标签页保存，仅连接你指定的中转站。</p>
    </motion.aside>
  );
}
