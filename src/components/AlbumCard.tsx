import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Download, ImageIcon } from 'lucide-react';
import type { BalbumsAlbum } from '@/lib/balbums-client';

interface AlbumCardProps {
  album: BalbumsAlbum;
  index: number;
  onSelect: (url: string) => void;
}

// Deterministic color from string for placeholder
function stringToHslColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 40%, 18%)`;
}

function stringToAccentColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 50%, 30%)`;
}

export function AlbumCard({ album, index, onSelect }: AlbumCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const bgColor = stringToHslColor(album.name);
  const accentColor = stringToAccentColor(album.name);

  // Check if image is already cached
  useEffect(() => {
    if (!album.thumbnail || imgError) return;
    const img = new Image();
    img.src = `/api/proxy?url=${encodeURIComponent(album.thumbnail)}`;
    img.onload = () => setImgLoaded(true);
    img.onerror = () => setImgError(true);
  }, [album.thumbnail, imgError]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
      className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all duration-200 group"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden" style={{ background: bgColor }}>
        {/* Blurhash placeholder */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0" style={{
              background: `linear-gradient(135deg, ${bgColor} 0%, ${accentColor} 50%, ${bgColor} 100%)`,
              filter: 'blur(0px)',
            }} />
            <div className="relative w-12 h-12 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-sm">
              <ImageIcon className="w-5 h-5 text-white/30" />
            </div>
          </div>
        )}

        {/* Actual image */}
        {album.thumbnail && !imgError ? (
          <img
            ref={imgRef}
            src={`/api/proxy?url=${encodeURIComponent(album.thumbnail)}`}
            alt={album.name}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-white/10" />
          </div>
        )}

        {/* File count badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full">
          <span className="text-xs font-medium text-white">{album.fileCount} files</span>
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onSelect(album.url)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Extrair
          </button>
          <a
            href={album.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir
          </a>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="text-xs sm:text-sm text-slate-200 font-medium truncate cursor-pointer hover:text-cyan-400 transition-colors"
          onClick={() => onSelect(album.url)}
          title={album.name}
        >
          {album.name}
        </h3>
        <p className="text-[10px] text-slate-500 mt-1 truncate font-mono">
          {album.url}
        </p>
      </div>
    </motion.div>
  );
}
