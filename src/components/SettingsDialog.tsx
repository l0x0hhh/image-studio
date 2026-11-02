import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Check, Eye, EyeOff, KeyRound, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ApiConnection, ModelInfo, StudioSettings } from "../types";
import { ModelPicker } from "./ModelPicker";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: StudioSettings;
  connection: ApiConnection;
  rememberKey: boolean;
  models: ModelInfo[];
  loading: boolean;
  status: string;
  onSave: (settings: StudioSettings, connection: ApiConnection, rememberKey: boolean) => void;
  onTest: (connection: ApiConnection) => void;
}

export function SettingsDialog({ open, onOpenChange, settings, connection, rememberKey, models, loading, status, onSave, onTest }: SettingsDialogProps) {
  const [draft, setDraft] = useState(settings);
  const [draftConnection, setDraftConnection] = useState(connection);
  const [remember, setRemember] = useState(rememberKey);
  const [showKey, setShowKey] = useState(false);
  useEffect(() => { if (open) { setDraft(settings); setDraftConnection(connection); setRemember(rememberKey); } }, [open, settings, connection, rememberKey]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && <Dialog.Portal forceMount>
          <Dialog.Overlay asChild><motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Dialog.Content asChild><motion.section className="modal settings-modal liquid-glass" initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} transition={{ type: "spring", stiffness: 330, damping: 28 }}>
            <div className="modal-header"><div><span className="modal-kicker">YOUR OWN CONNECTION</span><Dialog.Title>连接你的中转站</Dialog.Title><Dialog.Description>每位用户使用自己的 Base URL 和 Key，配置互不可见。</Dialog.Description></div><Dialog.Close className="modal-close" aria-label="关闭"><X size={18} /></Dialog.Close></div>
            <div className="secure-banner"><ShieldCheck size={21} /><div><strong>浏览器直连，不经过 MUSE 服务器</strong><p>Key 只发送给你填写的中转站，默认仅在当前标签页保留。</p></div></div>
            <div className="form-field"><label htmlFor="baseUrl">Base URL</label><input id="baseUrl" type="url" placeholder="https://your-relay.com/v1" value={draftConnection.baseUrl} onChange={event => setDraftConnection({ ...draftConnection, baseUrl: event.target.value })} /><p className="form-hint">通常填写到 /v1，也支持完整的生成接口地址。</p></div>
            <div className="form-field"><label htmlFor="apiKey">API Key</label><div className="password-input"><input id="apiKey" type={showKey ? "text" : "password"} placeholder="sk-••••••••••••••••" value={draftConnection.apiKey} onChange={event => setDraftConnection({ ...draftConnection, apiKey: event.target.value })} /><button type="button" aria-label="显示或隐藏密钥" onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</button></div><label className="remember-key"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />在此浏览器中记住 Key（公共电脑请勿勾选）</label></div>
            <div className="form-field settings-model-field"><label>默认图像模型</label><ModelPicker models={models} value={draft.defaultModel} onChange={defaultModel => setDraft({ ...draft, defaultModel })} /><p className="form-hint">{status}</p></div>
            <div className="form-field settings-model-field"><label>提示词优化模型</label><ModelPicker models={models} value={draft.optimizerModel} onChange={optimizerModel => setDraft({ ...draft, optimizerModel })} imageOnlyInitially={false} compact /><p className="form-hint">使用你自己的文本模型动态改写提示词。</p></div>
            <div className="form-row"><div className="form-field"><label htmlFor="settingsQuality">默认质量</label><select id="settingsQuality" className="standalone-select" value={draft.quality} onChange={event => setDraft({ ...draft, quality: event.target.value as StudioSettings["quality"] })}><option value="auto">自动</option><option value="high">高质量</option><option value="medium">均衡</option><option value="low">快速</option></select></div><div className="form-field"><label htmlFor="responseFormat">图片返回方式</label><select id="responseFormat" className="standalone-select" value={draft.responseFormat} onChange={event => setDraft({ ...draft, responseFormat: event.target.value as StudioSettings["responseFormat"] })}><option value="auto">自动 / 兼容模式</option><option value="b64_json">Base64</option><option value="url">图片 URL</option></select></div></div>
            <div className="key-security-note"><KeyRound size={14} />不会上传至 MUSE 或写入 GitHub；中转站需允许浏览器 CORS。</div>
            <div className="modal-footer"><button type="button" className="secondary-button" disabled={loading} onClick={() => onTest(draftConnection)}><RefreshCw size={14} className={loading ? "spinning" : ""} />测试当前配置</button><button type="button" className="primary-button" onClick={() => { onSave(draft, draftConnection, remember); onOpenChange(false); }}><Check size={15} />保存设置</button></div>
          </motion.section></Dialog.Content>
          </motion.div></Dialog.Overlay>
        </Dialog.Portal>}
      </AnimatePresence>
    </Dialog.Root>
  );
}
