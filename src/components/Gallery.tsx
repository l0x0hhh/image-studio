import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Download, Expand, Heart, ImageIcon, X } from "lucide-react";
import { useState } from "react";
import type { Artwork } from "../types";

interface GalleryProps {
  items: Artwork[];
  loading: boolean;
  loadingCount: number;
  favorites: Set<string>;
  onFavorite: (id: string) => void;
  onClear: () => void;
}

async function download(item: Artwork) {
  const response = await fetch(item.url);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `muse-${item.createdAt}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Gallery({ items, loading, loadingCount, favorites, onFavorite, onClear }: GalleryProps) {
  const [selected, setSelected] = useState<Artwork | null>(null);
  return (
    <section className="gallery-section">
      <div className="section-header"><div><h2>{loading ? "正在生成画面" : items.some(item => !item.demo) ? "最近创作" : "灵感精选"}</h2><span className="subtle-badge">{loading ? "AI 创作中" : `${items.length} 个画面`}</span></div><div className="gallery-actions">{items.some(item => !item.demo) && <button className="text-button" onClick={onClear}>清空会话</button>}</div></div>
      <motion.div className="gallery-grid" layout>
        <AnimatePresence mode="popLayout">
          {loading ? Array.from({ length: loadingCount }, (_, index) => <motion.article key={`loading-${index}`} className="art-card skeleton-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="art-image-wrap"><span className="loading-orbit" /></div><div className="art-info"><div className="loading-line" /><span>模型正在理解你的灵感…</span></div></motion.article>) : items.map((item, index) => (
            <motion.article layout key={item.id} className="art-card" initial={{ opacity: 0, y: 22, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 280, damping: 25, delay: Math.min(index * 0.045, 0.2) }} whileHover={{ y: -4 }}>
              <div className="art-image-wrap" onClick={() => setSelected(item)}>
                <img src={item.url} alt={item.prompt} loading="lazy" />
                <div className="art-gradient" />{item.demo && <span className="demo-tag">EDITOR’S PICK</span>}
                <div className="art-hover-actions"><button className={favorites.has(item.id) ? "favorite" : ""} title="收藏" onClick={event => { event.stopPropagation(); onFavorite(item.id); }}><Heart size={15} /></button><button title="下载" onClick={event => { event.stopPropagation(); void download(item); }}><Download size={15} /></button><button title="放大" onClick={event => { event.stopPropagation(); setSelected(item); }}><Expand size={14} /></button></div>
              </div>
              <div className="art-info"><p className="art-prompt" title={item.prompt}>{item.prompt}</p><div className="art-meta"><span><i />{item.model}</span><span>{item.ratio}{item.demo ? "" : " · 本次会话"}</span></div></div>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
      {!loading && !items.length && <motion.div className="empty-state" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><span><ImageIcon size={24} /></span><h3>这里还没有作品</h3><p>写下一句描述，开始你的第一次创作。</p></motion.div>}
      <Dialog.Root open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}>
        <AnimatePresence>{selected && <Dialog.Portal forceMount><Dialog.Overlay asChild><motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Dialog.Content asChild><motion.div className="lightbox-content" initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 27 }}><Dialog.Title className="sr-only">作品预览</Dialog.Title><Dialog.Close className="lightbox-close" aria-label="关闭预览"><X size={22} /></Dialog.Close><img src={selected.url} alt={selected.prompt} /><div className="lightbox-info"><div><span>MUSE CREATION</span><p>{selected.prompt}</p></div><button className="primary-button" onClick={() => void download(selected)}><Download size={15} />下载原图</button></div></motion.div></Dialog.Content></motion.div></Dialog.Overlay></Dialog.Portal>}</AnimatePresence>
      </Dialog.Root>
    </section>
  );
}
