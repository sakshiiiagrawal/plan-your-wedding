import { useState, useRef } from 'react';
import { HiOutlinePlus, HiOutlinePhotograph, HiOutlineX, HiOutlineDownload } from 'react-icons/hi';
import { SectionHeader } from '../../components/ui';

interface GalleryItem {
  id: string;
  src: string;
  label: string;
  span?: 'wide' | 'tall' | 'default';
}

const SAMPLE_ITEMS: GalleryItem[] = [
  { id: '1', src: '', label: 'Engagement ceremony', span: 'wide' },
  { id: '2', src: '', label: 'Mehendi portraits', span: 'tall' },
  { id: '3', src: '', label: 'Haldi moments', span: 'default' },
  { id: '4', src: '', label: 'Sangeet night', span: 'default' },
  { id: '5', src: '', label: 'Baraat procession', span: 'wide' },
  { id: '6', src: '', label: 'Wedding vows', span: 'tall' },
  { id: '7', src: '', label: 'Reception highlights', span: 'default' },
  { id: '8', src: '', label: 'Couple portraits', span: 'default' },
];

const GRADIENTS = [
  'from-gold-100 to-gold-200',
  'from-rose-100 to-rose-200',
  'from-maroon-50 to-maroon-100',
  'from-amber-100 to-amber-200',
  'from-yellow-50 to-gold-100',
  'from-pink-100 to-rose-100',
  'from-orange-100 to-amber-100',
  'from-cream to-gold-50',
];

function GalleryCard({ item, index }: { item: GalleryItem; index: number }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const spanCols = item.span === 'wide' ? 'md:col-span-2' : '';
  const spanRows = item.span === 'tall' ? 'md:row-span-2' : '';

  return (
    <div
      className={`relative group rounded-xl overflow-hidden cursor-pointer ${spanCols} ${spanRows}`}
      style={{ minHeight: item.span === 'tall' ? 320 : 180 }}
    >
      {item.src ? (
        <img src={item.src} alt={item.label} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <HiOutlinePhotograph className="w-10 h-10 text-gold-300" />
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-end">
        <div className="translate-y-full group-hover:translate-y-0 transition-transform duration-200 w-full p-3 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-white text-sm font-medium truncate">{item.label}</p>
        </div>
      </div>

      {/* Download button on hover */}
      {item.src && (
        <button className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <HiOutlineDownload className="w-4 h-4 text-gray-700" />
        </button>
      )}
    </div>
  );
}

export default function Gallery() {
  const [items] = useState<GalleryItem[]>(SAMPLE_ITEMS);
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Memories"
        title="Gallery"
        description="Your wedding moments, beautifully organized."
        action={
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-maroon-800 text-white rounded-lg text-sm font-medium hover:bg-maroon-900 transition-colors"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Upload photos
          </button>
        }
      />

      {/* Masonry grid */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoFlow: 'dense',
        }}
      >
        {items.map((item, i) => (
          <GalleryCard key={item.id} item={item} index={i} />
        ))}

        {/* Upload placeholder */}
        <div
          onClick={() => fileRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-gold-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gold-400 hover:bg-gold-50 transition-colors"
          style={{ minHeight: 180 }}
        >
          <HiOutlinePlus className="w-8 h-8 text-gold-300" />
          <p className="text-xs text-gray-400">Add photos</p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={() => {
          /* upload handler goes here */
        }}
      />

      {/* Upload modal placeholder */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gold-500 font-semibold mb-0.5">
                  Memories
                </p>
                <h2 className="font-serif-display text-2xl text-maroon-800">Upload photos</h2>
              </div>
              <button
                onClick={() => setShowUpload(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gold-200 rounded-xl p-12 text-center cursor-pointer hover:border-gold-400 hover:bg-gold-50 transition-colors"
            >
              <HiOutlinePhotograph className="w-12 h-12 text-gold-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Click to browse or drag photos here</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, HEIC up to 20 MB each</p>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowUpload(false)} className="btn-outline flex-1">
                Cancel
              </button>
              <button className="btn-primary flex-1">Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
