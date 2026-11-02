import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ModelInfo } from "../types";

const spring = { type: "spring" as const, stiffness: 430, damping: 32, mass: 0.75 };
const isImageModel = (id: string) => /image|dall|flux|seedream|imagen/i.test(id);

interface ModelPickerProps {
  models: ModelInfo[];
  value: string;
  onChange: (value: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  imageOnlyInitially?: boolean;
  compact?: boolean;
}

export function ModelPicker({ models, value, onChange, onRefresh, loading, imageOnlyInitially = true, compact }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [imageOnly, setImageOnly] = useState(imageOnlyInitially);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const filtered = useMemo(() => models.filter(model =>
    (!imageOnly || isImageModel(model.id)) && (!query || model.id.toLowerCase().includes(query.toLowerCase())),
  ), [models, imageOnly, query]);

  return (
    <div className="model-picker" ref={root}>
      <div className={`model-input-wrap ${compact ? "compact" : ""}`}>
        <Sparkles className="model-symbol" size={15} aria-hidden="true" />
        <input
          value={value}
          aria-label="搜索或输入模型 ID"
          autoComplete="off"
          onFocus={() => { setOpen(true); setQuery(""); }}
          onChange={event => { onChange(event.target.value); setQuery(event.target.value); setOpen(true); }}
          onKeyDown={event => { if (event.key === "Enter" || event.key === "Escape") setOpen(false); }}
        />
        {onRefresh && (
          <button className={`fetch-models-button ${loading ? "loading" : ""}`} type="button" title="拉取可用模型" aria-label="拉取可用模型" disabled={loading} onClick={onRefresh}>
            <RefreshCw size={14} />
          </button>
        )}
        <button className="model-dropdown-button" type="button" aria-label="展开模型列表" aria-expanded={open} onClick={() => { setOpen(!open); setQuery(""); }}>
          <ChevronDown size={14} />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="model-dropdown" initial={{ opacity: 0, y: -7, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.98 }} transition={spring}>
            <div className="model-dropdown-header">
              <span>{imageOnly ? "生图模型" : "全部模型"} · {filtered.length}</span>
              <button type="button" onClick={() => setImageOnly(!imageOnly)}>{imageOnly ? "查看全部" : "只看生图"}</button>
            </div>
            <div className="model-menu-list">
              {filtered.length ? filtered.map(model => (
                <motion.button layout key={model.id} className={`model-menu-item ${model.id === value ? "selected" : ""}`} type="button" onClick={() => { onChange(model.id); setOpen(false); }} whileHover={{ x: 2 }}>
                  <span>{model.id}</span><span className="model-type-badge">{isImageModel(model.id) ? "生图" : "其他"}</span>
                </motion.button>
              )) : <div className="model-menu-empty">没有匹配的模型，可直接使用输入的 ID</div>}
            </div>
            <div className="model-dropdown-footer">输入关键词搜索，也支持自定义模型 ID</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { isImageModel };
