import React from 'react';

const CF_WIDTHS = [160, 320, 480, 640, 960] as const;

function cfResizeUrl(src: string, width: number, format: 'avif' | 'webp' | 'auto' = 'auto'): string {
  try {
    const url = new URL(src);
    url.pathname = `/cdn-cgi/image/width=${width},fit=cover,format=${format},quality=80${url.pathname}`;
    return url.toString();
  } catch {
    return src;
  }
}

function buildSrcSet(src: string, format: 'avif' | 'webp' | 'auto' = 'auto'): string {
  return CF_WIDTHS.map(w => `${cfResizeUrl(src, w, format)} ${w}w`).join(', ');
}

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Skip Cloudflare Image Resizing srcset (e.g. for data URIs or already-optimized sources) */
  skipCdn?: boolean;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  skipCdn,
  priority,
  sizes,
  style,
  className,
  ...rest
}: OptimizedImageProps) {
  const useCdn = !skipCdn && src.startsWith('http');

  if (useCdn) {
    return (
      <picture>
        <source type="image/avif" srcSet={buildSrcSet(src, 'avif')} sizes={sizes} />
        <source type="image/webp" srcSet={buildSrcSet(src, 'webp')} sizes={sizes} />
        <img
          src={cfResizeUrl(src, width)}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : undefined}
          sizes={sizes}
          style={style}
          className={className}
          {...rest}
        />
      </picture>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      sizes={sizes}
      style={style}
      className={className}
      {...rest}
    />
  );
}
