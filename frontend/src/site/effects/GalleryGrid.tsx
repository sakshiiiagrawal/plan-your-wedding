import { motion } from 'framer-motion';
import type { GalleryLayoutId, Palette } from '../types';
import { fadeUp, flipIn, staggerTight, inViewProps } from '../motion';

/**
 * The shared, couple-configurable photo grid. The Studio stores the pick in
 * the page's `config.gallery_layout`; any template with a photo section
 * renders this instead of hand-rolling a grid, so every layout stays
 * lightbox-wired, lazy, and palette-tinted.
 */
export default function GalleryGrid({
  images,
  layout = 'mosaic',
  palette,
  reduced,
  onOpen,
}: {
  images: { url: string }[];
  layout?: GalleryLayoutId | undefined;
  palette: Palette;
  reduced: boolean;
  onOpen: (index: number) => void;
}) {
  const p = palette;

  const photo = (url: string, className = '') => (
    <img
      src={url}
      alt=""
      loading="lazy"
      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${className}`}
    />
  );

  const goldInset = (
    <span
      className="absolute inset-2 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      style={{ border: `1px solid ${p.accent}` }}
      aria-hidden
    />
  );

  if (layout === 'masonry') {
    return (
      <motion.div variants={staggerTight} {...inViewProps} className="columns-2 md:columns-3 gap-4">
        {images.map((image, i) => (
          <motion.button
            key={image.url}
            variants={fadeUp}
            onClick={() => onOpen(i)}
            className="group relative block w-full mb-4 overflow-hidden rounded-xl break-inside-avoid"
          >
            <img
              src={image.url}
              alt=""
              loading="lazy"
              className="w-full h-auto group-hover:scale-105 transition-transform duration-500"
            />
            {goldInset}
          </motion.button>
        ))}
      </motion.div>
    );
  }

  if (layout === 'filmstrip') {
    return (
      <motion.div
        variants={staggerTight}
        {...inViewProps}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
        style={{
          WebkitMaskImage:
            'linear-gradient(90deg, transparent, black 4%, black 96%, transparent)',
          maskImage: 'linear-gradient(90deg, transparent, black 4%, black 96%, transparent)',
        }}
      >
        {images.map((image, i) => (
          <motion.button
            key={image.url}
            variants={fadeUp}
            onClick={() => onOpen(i)}
            className="group relative shrink-0 snap-center overflow-hidden rounded-xl"
            style={{ height: 'clamp(240px, 42vw, 380px)', aspectRatio: '3 / 4' }}
          >
            {photo(image.url)}
            {goldInset}
          </motion.button>
        ))}
      </motion.div>
    );
  }

  if (layout === 'polaroid') {
    return (
      <motion.div
        variants={staggerTight}
        {...inViewProps}
        className="flex flex-wrap justify-center gap-6 sm:gap-8"
      >
        {images.map((image, i) => (
          <motion.button
            key={image.url}
            variants={fadeUp}
            onClick={() => onOpen(i)}
            {...(reduced ? {} : { whileHover: { rotate: 0, scale: 1.04, zIndex: 1 } })}
            className="group relative p-3 pb-10 rounded-sm"
            style={{
              background: p.surface,
              rotate: reduced ? 0 : i % 2 === 0 ? -2.5 : 2.5,
              border: `1px solid ${p.line}`,
              boxShadow: '0 18px 36px -18px rgba(0,0,0,0.35)',
              width: 'clamp(150px, 34vw, 240px)',
            }}
          >
            <span className="block overflow-hidden" style={{ aspectRatio: '4 / 5' }}>
              {photo(image.url)}
            </span>
            <span
              className="absolute bottom-3 left-0 right-0 text-center font-script text-lg"
              style={{ color: p.inkSoft }}
              aria-hidden
            >
              {i + 1 < 10 ? `№ ${i + 1}` : `№${i + 1}`}
            </span>
          </motion.button>
        ))}
      </motion.div>
    );
  }

  // mosaic (default): square tiles, every fifth photo featured at 2×2.
  return (
    <motion.div
      variants={staggerTight}
      {...inViewProps}
      className="grid grid-cols-2 md:grid-cols-4 grid-flow-dense gap-4"
      style={{ perspective: '1400px' }}
    >
      {images.map((image, i) => {
        const feature = i % 5 === 0;
        return (
          <motion.button
            key={image.url}
            variants={reduced ? fadeUp : flipIn}
            onClick={() => onOpen(i)}
            className={`overflow-hidden rounded-xl group relative ${feature ? 'col-span-2 row-span-2' : ''}`}
            style={{ aspectRatio: '1 / 1' }}
          >
            {photo(image.url)}
            {goldInset}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
