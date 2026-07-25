import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, SkipBack, SkipForward, Loader2 } from 'lucide-react';

interface MediaPlayerProps {
  url: string;
  filename: string;
  onClose: () => void;
}

function getFileType(url: string): 'video' | 'audio' | 'image' | 'unknown' {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'webm', 'mkv', 'avi', 'mov', 'ogv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  return 'unknown';
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MediaPlayer({ url, filename, onClose }: MediaPlayerProps) {
  const fileType = getFileType(url);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(el.currentTime);
      if (el.buffered.length > 0) {
        setBuffered(el.buffered.end(el.buffered.length - 1));
      }
    };
    const onLoadedMetadata = () => {
      setDuration(el.duration);
      setLoading(false);
    };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onError = () => { setError(true); setLoading(false); };
    const onEnded = () => setPlaying(false);

    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('error', onError);
    el.addEventListener('ended', onEnded);

    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('error', onError);
      el.removeEventListener('ended', onEnded);
    };
  }, [url]);

  const togglePlay = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(!muted);
  }, [muted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (mediaRef.current) mediaRef.current.volume = val;
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = mediaRef.current;
    const bar = progressRef.current;
    if (!el || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    el.currentTime = pos * el.duration;
  }, []);

  const skip = useCallback((seconds: number) => {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration, el.currentTime + seconds));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = mediaRef.current as HTMLVideoElement | null;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowLeft') skip(-10);
      if (e.key === 'ArrowRight') skip(10);
      if (e.key === 'm' || e.key === 'M') toggleMute();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, togglePlay, skip, toggleMute, toggleFullscreen]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-5xl mx-4 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                {fileType === 'video' && <Play className="w-4 h-4 text-white" />}
                {fileType === 'audio' && <Volume2 className="w-4 h-4 text-white" />}
                {fileType === 'image' && <Maximize2 className="w-4 h-4 text-white" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{filename}</p>
                <p className="text-[10px] text-slate-500">{fileType.toUpperCase()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Media */}
          <div className="relative bg-black aspect-video flex items-center justify-center">
            {loading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-xs text-slate-400">Carregando...</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <p className="text-sm text-red-400">Erro ao carregar mídia</p>
                <p className="text-xs text-slate-500">Tente copiar a URL e abrir no navegador</p>
              </div>
            )}

            {fileType === 'video' && (
              <video
                ref={videoRef as React.RefObject<HTMLVideoElement>}
                src={url}
                className="w-full h-full object-contain"
                preload="metadata"
                playsInline
                onClick={togglePlay}
              />
            )}

            {fileType === 'audio' && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-purple-900/30 to-cyan-900/30">
                <audio ref={audioRef as React.RefObject<HTMLAudioElement>} src={url} preload="metadata" />
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Volume2 className="w-16 h-16 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-200 font-medium">{filename}</p>
                  <p className="text-xs text-slate-500">{formatTime(duration)}</p>
                </div>
              </div>
            )}

            {fileType === 'image' && (
              <img
                src={url}
                alt={filename}
                className="max-w-full max-h-full object-contain"
                onError={() => setError(true)}
              />
            )}
          </div>

          {/* Controls (video/audio only) */}
          {(fileType === 'video' || fileType === 'audio') && !error && (
            <div className="bg-slate-800 px-4 py-3 space-y-2">
              {/* Progress bar */}
              <div
                ref={progressRef}
                onClick={handleProgressClick}
                className="relative h-2 bg-slate-700 rounded-full cursor-pointer group"
              >
                {/* Buffered */}
                <div
                  className="absolute top-0 left-0 h-full bg-slate-600 rounded-full"
                  style={{ width: `${duration > 0 ? (buffered / duration) * 100 : 0}%` }}
                />
                {/* Progress */}
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 6px)` }}
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={() => skip(-10)} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors" title="-10s">
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button onClick={togglePlay} className="p-2 text-white hover:bg-slate-700 rounded-lg transition-colors">
                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button onClick={() => skip(10)} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors" title="+10s">
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                <div className="flex items-center gap-1">
                  <div
                    className="relative"
                    onMouseEnter={() => setShowVolume(true)}
                    onMouseLeave={() => setShowVolume(false)}
                  >
                    <button onClick={toggleMute} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
                      {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    {showVolume && (
                      <div className="absolute bottom-full right-0 mb-2 p-2 bg-slate-700 rounded-lg">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-20 accent-cyan-500"
                        />
                      </div>
                    )}
                  </div>
                  <button onClick={toggleFullscreen} className="p-1.5 text-slate-400 hover:text-white rounded transition-colors">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
