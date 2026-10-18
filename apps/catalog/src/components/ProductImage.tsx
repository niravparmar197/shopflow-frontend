import { useState } from 'react';
import { ImageOff, Package } from 'lucide-react';

/** A product photo, or a calm placeholder when there is none (or it fails). */
export function ProductImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    const Icon = src ? ImageOff : Package;
    return (
      <div className={`cat:grid cat:w-full cat:place-items-center cat:rounded-lg cat:bg-primary-soft cat:text-primary/60 ${className}`}>
        <Icon className="cat:size-10" aria-hidden />
        {alt && <span className="cat:sr-only">{alt} (no photo)</span>}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`cat:w-full cat:rounded-lg cat:bg-canvas cat:object-cover ${className}`}
    />
  );
}
