import * as Tabs from "@radix-ui/react-tabs";
import { AnimatePresence, motion } from "motion/react";
import { ImagePlus, Images, Sparkles, WandSparkles, X } from "lucide-react";
import { useRef } from "react";
import type { CreationMode, Ratio } from "../types";

export interface ReferenceImage { id: string; dataURL: string; name: string }

interface PromptComposerProps {
  prompt: string;
  mode: CreationMode;
  model: string;
  ratio: Ratio;
  count: number;
  references: ReferenceImage[];
  optimizing: boolean;
  generating: boolean;
  onPromptChange: (prompt: string) => void;
  onModeChange: (mode: CreationMode) => void;
  onReferencesChange: (references: ReferenceImage[]) => void;
  onOptimize: () => void;
  onGenerate: () => void;
  onCycleRatio: () => void;
  onCycleCount: () => void;
}

export function PromptComposer(props: PromptComposerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const readFiles = async (files: FileList | null) => {
    if (!files) return;
    const selected = [...files].filter(file => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024).slice(0, 5 - props.references.length);
    const loaded = await Promise.all(selected.map(file => new Promise<ReferenceImage>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: crypto.randomUUID(), dataURL: String(reader.result), name: file.name });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    props.onReferencesChange([...props.references, ...loaded]);
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <motion.section className="composer liquid-glass" layout initial={{ opacity: 0, y: 18, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 250, damping: 25, delay: 0.06 }}>
      <Tabs.Root value={props.mode} onValueChange={value => props.onModeChange(value as CreationMode)}>
        <div className="composer-top">
          <Tabs.List className="mode-tabs" aria-label="创作模式"><Tabs.Trigger className="mode-tab" value="text">文生图</Tabs.Trigger><Tabs.Trigger className="mode-tab" value="image">参考图创作</Tabs.Trigger></Tabs.List>
          <span className="model-mini"><i /><span>{props.model || "未选择模型"}</span></span>
        </div>
      </Tabs.Root>
      <AnimatePresence initial={false}>
        {props.mode === "image" && (
          <motion.div className="reference-zone" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
            <button className="upload-button" type="button" onClick={() => fileInput.current?.click()}><ImagePlus size={16} />添加参考图</button>
            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={event => void readFiles(event.target.files)} />
            <div className="reference-list">{props.references.map(image => <motion.div layout key={image.id} className="reference-thumb" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><img src={image.dataURL} alt={image.name} /><button onClick={() => props.onReferencesChange(props.references.filter(item => item.id !== image.id))} aria-label="移除参考图"><X size={11} /></button></motion.div>)}</div>
            <span className="reference-hint">最多 5 张，单张不超过 10MB</span>
          </motion.div>
        )}
      </AnimatePresence>
      <textarea id="promptInput" maxLength={2000} value={props.prompt} onChange={event => props.onPromptChange(event.target.value)} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); props.onGenerate(); } }} placeholder={props.mode === "image" ? "描述希望如何参考或修改图片，例如：保留主体，将背景替换为日落时的海边……" : "描述你脑海中的画面，例如：一座漂浮在云海中的东方庭院，晨光穿过薄雾，电影感光影……"} />
      <div className="prompt-tools"><button onClick={props.onOptimize} disabled={props.optimizing} className={props.optimizing ? "loading" : ""} title="由服务端文本模型动态优化"><WandSparkles size={15} /><span>{props.optimizing ? "AI 优化中…" : "AI 优化描述"}</span></button><span>{props.prompt.length} / 2000</span></div>
      <div className="composer-footer">
        <div className="quick-params"><button onClick={props.onCycleRatio}><span className="ratio-outline" />{props.ratio}</button><button onClick={props.onCycleCount}><Images size={14} />{props.count} 张</button></div>
        <motion.button className={`generate-button ${props.generating ? "loading" : ""}`} onClick={props.onGenerate} disabled={props.generating || props.optimizing} whileHover={{ scale: 1.025, y: -1 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 480, damping: 24 }}>
          <Sparkles size={17} /><span>{props.generating ? "正在生成…" : "开始生成"}</span><kbd>⌘ ↵</kbd>
        </motion.button>
      </div>
    </motion.section>
  );
}
