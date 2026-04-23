import React, { useCallback, useRef, useState } from 'react';
import { useIntl, defineMessages } from 'react-intl';

/* ─── Design tokens (matches app-wide palette) ─── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgOverlay:     '#121D33',
  border:        '#1F2D48',
  borderStrong:  '#253350',
  brand:         '#1654d9',
  brandHover:    '#1244b8',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  error:         '#EF4444',
  success:       '#22C55E',
  warning:       '#F59E0B',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

/* ─── Portal definitions ─── */
const PORTALS = [
  { id: 'zonaprop',     label: 'ZonaProp' },
  { id: 'argenprop',    label: 'Argenprop' },
  { id: 'mercadolibre', label: 'MercadoLibre' },
  { id: 'properati',   label: 'Properati' },
];

/* ─── Types ─── */
export interface MediaItem {
  id: string;
  mediaType: 'photo' | 'video' | 'floorplan';
  sortOrder: number;
  storageKey: string;
  thumbUrl: string | null;
  caption: string;
  portalOverrides: Record<string, { hidden: boolean }>;
  // UI-only upload state
  file?: File;
  uploadProgress?: number;
  previewUrl?: string;
  uploadError?: string;
}

interface GalleryEditorProps {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}

/* ─── i18n ─── */
const msg = defineMessages({
  uploadDrop:     { id: 'gallery.upload.drop' },
  uploadBtn:      { id: 'gallery.upload.btn' },
  uploadHint:     { id: 'gallery.upload.hint' },
  count:          { id: 'gallery.count' },
  limit:          { id: 'gallery.limit' },
  empty:          { id: 'gallery.empty' },
  captionPh:      { id: 'gallery.caption.placeholder' },
  cover:          { id: 'gallery.cover' },
  typePhoto:      { id: 'gallery.type.photo' },
  typeVideo:      { id: 'gallery.type.video' },
  typeFloorplan:  { id: 'gallery.type.floorplan' },
  portalHide:     { id: 'gallery.portal.hide' },
  deleteItem:     { id: 'gallery.delete' },
  uploading:      { id: 'gallery.uploading' },
  errSizePhoto:   { id: 'gallery.error.size.photo' },
  errSizeVideo:   { id: 'gallery.error.size.video' },
  errSizeFloor:   { id: 'gallery.error.size.floorplan' },
  errType:        { id: 'gallery.error.type' },
  errLimit:       { id: 'gallery.error.limit' },
});

/* ─── File validation ─── */
function classifyFile(file: File): { mediaType: MediaItem['mediaType']; error?: string } {
  const name = file.name.toLowerCase();
  const type = file.type;
  const MB = 1024 * 1024;

  if (type === 'application/pdf' || name.endsWith('.svg') || type === 'image/svg+xml') {
    if (file.size > 50 * MB) return { mediaType: 'floorplan', error: 'gallery.error.size.floorplan' };
    return { mediaType: 'floorplan' };
  }

  if (type.startsWith('video/') || name.endsWith('.mov') || name.endsWith('.mp4')) {
    if (file.size > 500 * MB) return { mediaType: 'video', error: 'gallery.error.size.video' };
    return { mediaType: 'video' };
  }

  const photoTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const photoExts = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
  const isPhoto = photoTypes.includes(type) || photoExts.some((ext) => name.endsWith(ext));
  if (isPhoto) {
    if (file.size > 20 * MB) return { mediaType: 'photo', error: 'gallery.error.size.photo' };
    return { mediaType: 'photo' };
  }

  return { mediaType: 'photo', error: 'gallery.error.type' };
}

function genId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── MediaCard ─── */
interface MediaCardProps {
  item: MediaItem;
  index: number;
  isFirst: boolean;
  isDragTarget: boolean;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDrop: (e: React.DragEvent, i: number) => void;
  onDragEnd: () => void;
  onCaptionChange: (id: string, caption: string) => void;
  onPortalToggle: (id: string, portalId: string, hidden: boolean) => void;
  onDelete: (id: string) => void;
}

function MediaCard({
  item,
  index,
  isFirst,
  isDragTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCaptionChange,
  onPortalToggle,
  onDelete,
}: MediaCardProps) {
  const intl = useIntl();
  const [showPortals, setShowPortals] = useState(false);

  const typeLabel =
    item.mediaType === 'photo'
      ? intl.formatMessage(msg.typePhoto)
      : item.mediaType === 'video'
        ? intl.formatMessage(msg.typeVideo)
        : intl.formatMessage(msg.typeFloorplan);

  const typeColor =
    item.mediaType === 'photo'
      ? C.brand
      : item.mediaType === 'video'
        ? '#7C3AED'
        : '#0891B2';

  const hiddenPortalCount = Object.values(item.portalOverrides).filter((v) => v.hidden).length;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      style={{
        position: 'relative',
        borderRadius: 10,
        border: `1.5px solid ${isDragTarget ? C.brand : C.border}`,
        background: C.bgRaised,
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        boxShadow: isDragTarget
          ? `0 0 0 2px ${C.brand}40, 0 8px 24px rgba(0,0,0,0.4)`
          : '0 2px 8px rgba(0,0,0,0.3)',
        transform: isDragTarget ? 'scale(1.01)' : 'scale(1)',
        cursor: 'grab',
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: C.bgOverlay }}>
        {item.previewUrl && item.mediaType === 'photo' ? (
          <img
            src={item.previewUrl}
            alt={item.caption || 'foto'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : item.thumbUrl ? (
          <img
            src={item.thumbUrl}
            alt={item.caption || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.mediaType === 'video' ? (
              <VideoIcon />
            ) : item.mediaType === 'floorplan' ? (
              <FloorplanIcon />
            ) : (
              <PhotoIcon />
            )}
          </div>
        )}

        {/* Upload progress overlay */}
        {item.uploadProgress !== undefined && item.uploadProgress < 100 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(7,13,26,0.75)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <div style={{ fontFamily: F.mono, fontSize: 13, color: C.textPrimary }}>
              {item.uploadProgress}%
            </div>
            <div
              style={{
                width: 80,
                height: 3,
                background: C.border,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${item.uploadProgress}%`,
                  background: C.brand,
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        )}

        {/* Upload error overlay */}
        {item.uploadError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(239,68,68,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8,
            }}
          >
            <span style={{ fontSize: 11, color: C.error, textAlign: 'center', fontFamily: F.body }}>
              {item.uploadError}
            </span>
          </div>
        )}

        {/* Badges row */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          {isFirst && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                fontFamily: F.body,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '2px 6px',
                borderRadius: 4,
                background: C.warning,
                color: '#000',
              }}
            >
              {intl.formatMessage(msg.cover)}
            </span>
          )}
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              fontFamily: F.body,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '2px 6px',
              borderRadius: 4,
              background: typeColor,
              color: '#fff',
            }}
          >
            {typeLabel}
          </span>
        </div>

        {/* Delete button */}
        <button
          type="button"
          title={intl.formatMessage(msg.deleteItem)}
          onClick={() => onDelete(item.id)}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'rgba(7,13,26,0.75)',
            border: `1px solid ${C.border}`,
            color: C.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = C.error;
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.error;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = C.textSecondary;
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
          }}
        >
          <TrashIcon />
        </button>

        {/* Drag handle */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            color: C.textTertiary,
            opacity: 0.6,
          }}
        >
          <GripIcon />
        </div>
      </div>

      {/* Caption + Portal controls */}
      <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          type="text"
          value={item.caption}
          maxLength={200}
          placeholder={intl.formatMessage(msg.captionPh)}
          onChange={(e) => onCaptionChange(item.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            background: C.bgOverlay,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '5px 8px',
            fontSize: 12,
            fontFamily: F.body,
            color: C.textPrimary,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = C.brand; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = C.border; }}
        />

        {/* Portal toggles */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowPortals((s) => !s); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 0',
            color: hiddenPortalCount > 0 ? C.warning : C.textTertiary,
            fontSize: 11,
            fontFamily: F.body,
          }}
        >
          <span>{intl.formatMessage(msg.portalHide)}</span>
          {hiddenPortalCount > 0 && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 4,
                background: `${C.warning}20`,
                color: C.warning,
                border: `1px solid ${C.warning}40`,
              }}
            >
              {hiddenPortalCount}
            </span>
          )}
        </button>

        {showPortals && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            {PORTALS.map((portal) => {
              const hidden = item.portalOverrides[portal.id]?.hidden ?? false;
              return (
                <label
                  key={portal.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontSize: 11,
                    color: hidden ? C.warning : C.textSecondary,
                    fontFamily: F.body,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hidden}
                    onChange={(e) => onPortalToggle(item.id, portal.id, e.target.checked)}
                    style={{ accentColor: C.warning, width: 12, height: 12 }}
                  />
                  {portal.label}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── GalleryEditor ─── */
export function GalleryEditor({ items, onChange }: GalleryEditorProps) {
  const intl = useIntl();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const uploadTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  // Always-current items ref so interval callbacks don't capture stale state
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const photoCount = items.filter((i) => i.mediaType === 'photo').length;

  /* Simulate CF Images upload progress */
  const simulateUpload = useCallback(
    (id: string) => {
      let progress = 0;
      const timer = setInterval(() => {
        progress += Math.floor(Math.random() * 18) + 8;
        if (progress >= 100) {
          progress = 100;
          clearInterval(timer);
          uploadTimers.current.delete(id);
          onChange(
            itemsRef.current.map((item) =>
              item.id === id
                ? { ...item, uploadProgress: 100, storageKey: `mock/${id}` }
                : item,
            ),
          );
        } else {
          onChange(
            itemsRef.current.map((item) =>
              item.id === id ? { ...item, uploadProgress: progress } : item,
            ),
          );
        }
      }, 180);
      uploadTimers.current.set(id, timer);
    },
    [onChange],
  );

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      const newItems: MediaItem[] = [];
      const errors: string[] = [];

      for (const file of fileArr) {
        if (photoCount + newItems.filter((i) => i.mediaType === 'photo').length >= 200) {
          errors.push(intl.formatMessage(msg.errLimit));
          break;
        }
        const { mediaType, error } = classifyFile(file);
        if (error) {
          errors.push(intl.formatMessage({ id: error }));
          continue;
        }

        const id = genId();
        const previewUrl =
          mediaType === 'photo' ? URL.createObjectURL(file) : undefined;

        newItems.push({
          id,
          mediaType,
          sortOrder: items.length + newItems.length,
          storageKey: '',
          thumbUrl: null,
          caption: '',
          portalOverrides: {},
          file,
          uploadProgress: 0,
          previewUrl,
        });
      }

      if (newItems.length > 0) {
        const nextItems = [...items, ...newItems];
        onChange(nextItems);
        // Start simulated uploads after state update
        for (const item of newItems) {
          setTimeout(() => simulateUpload(item.id), 50);
        }
      }
    },
    [items, onChange, photoCount, intl, simulateUpload],
  );

  /* Drag-to-reorder handlers */
  const handleDragStart = useCallback((i: number) => setDragIdx(i), []);

  const handleDragOver = useCallback((e: React.DragEvent, i: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIdx(i);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIdx: number) => {
      e.preventDefault();
      if (dragIdx === null || dragIdx === targetIdx) {
        setDragIdx(null);
        setDropIdx(null);
        return;
      }
      const next = [...items];
      const moved = next.splice(dragIdx, 1)[0] as MediaItem;
      next.splice(targetIdx, 0, moved);
      onChange(next.map((item, idx) => ({ ...item, sortOrder: idx })));
      setDragIdx(null);
      setDropIdx(null);
    },
    [dragIdx, items, onChange],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDropIdx(null);
  }, []);

  /* Item mutations */
  const handleCaptionChange = useCallback(
    (id: string, caption: string) => {
      onChange(items.map((item) => (item.id === id ? { ...item, caption } : item)));
    },
    [items, onChange],
  );

  const handlePortalToggle = useCallback(
    (id: string, portalId: string, hidden: boolean) => {
      onChange(
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                portalOverrides: {
                  ...item.portalOverrides,
                  [portalId]: { hidden },
                },
              }
            : item,
        ),
      );
    },
    [items, onChange],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      const timer = uploadTimers.current.get(id);
      if (timer) { clearInterval(timer); uploadTimers.current.delete(id); }
      onChange(
        items
          .filter((i) => i.id !== id)
          .map((i, idx) => ({ ...i, sortOrder: idx })),
      );
    },
    [items, onChange],
  );

  /* Drop zone handlers (file drop) */
  const handleZoneDragEnter = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) setDropZoneActive(true);
  };
  const handleZoneDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropZoneActive(false);
  };
  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneActive(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };
  const handleZoneDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Upload zone */}
      <div
        onDragEnter={handleZoneDragEnter}
        onDragLeave={handleZoneDragLeave}
        onDragOver={handleZoneDragOver}
        onDrop={handleZoneDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dropZoneActive ? C.brand : C.border}`,
          borderRadius: 12,
          padding: '28px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dropZoneActive ? `${C.brand}08` : 'transparent',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <UploadCloudIcon color={dropZoneActive ? C.brand : C.textTertiary} />
          <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, fontFamily: F.body }}>
            {intl.formatMessage(msg.uploadDrop)}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: C.textTertiary, fontFamily: F.body }}>
            {intl.formatMessage(msg.uploadHint)}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/svg+xml,video/mp4,video/quicktime,application/pdf,.heic,.heif,.mov,.svg"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.length) {
              processFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* Count + limit */}
      {items.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: C.textTertiary,
            fontFamily: F.body,
          }}
        >
          <span>
            {intl.formatMessage(msg.count, { count: items.length })}
          </span>
          <span>{intl.formatMessage(msg.limit)}</span>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <p
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: C.textTertiary,
            fontFamily: F.body,
            margin: '8px 0 0',
          }}
        >
          {intl.formatMessage(msg.empty)}
        </p>
      )}

      {/* Media grid */}
      {items.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {items.map((item, idx) => (
            <MediaCard
              key={item.id}
              item={item}
              index={idx}
              isFirst={idx === 0}
              isDragTarget={dropIdx === idx && dragIdx !== idx}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onCaptionChange={handleCaptionChange}
              onPortalToggle={handlePortalToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Inline SVG icons ─── */
function UploadCloudIcon({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
      <line x1="7" y1="2" x2="7" y2="22"/>
      <line x1="17" y1="2" x2="17" y2="22"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="2" y1="7" x2="7" y2="7"/>
      <line x1="2" y1="17" x2="7" y2="17"/>
      <line x1="17" y1="17" x2="22" y2="17"/>
      <line x1="17" y1="7" x2="22" y2="7"/>
    </svg>
  );
}

function FloorplanIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
      <line x1="9" y1="11" x2="11" y2="11"/>
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#506180" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
      <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
    </svg>
  );
}
