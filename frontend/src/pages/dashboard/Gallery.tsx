import { useRef, useState } from 'react';
import { HiOutlinePlus, HiOutlinePhotograph, HiOutlineTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { SectionHeader } from '../../components/ui';
import {
  useGalleryContent,
  useUploadGalleryImage,
  useDeleteGalleryImage,
} from '../../hooks/useApi';

const GRADIENTS = [
  'from-gold-100 to-gold-200',
  'from-rose-100 to-rose-200',
  'from-maroon-50 to-maroon-100',
  'from-amber-100 to-amber-200',
];

function GalleryCard({
  url,
  index,
  onDelete,
}: {
  url: string;
  index: number;
  onDelete: () => void;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <div
      className="relative group rounded-xl overflow-hidden cursor-pointer"
      style={{ minHeight: 180 }}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
        >
          <HiOutlinePhotograph className="w-10 h-10 text-gold-300" />
        </div>
      )}

      <button
        onClick={onDelete}
        className="absolute top-2 right-2 p-1.5 bg-surface-panel/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <HiOutlineTrash className="w-4 h-4 text-ink-mid" />
      </button>
    </div>
  );
}

// Images are fetched as one JSON array (no server pagination is possible —
// there's no per-image row/id, just a blob on the wedding's website_content
// row) — this caps how many render at once, purely a DOM-size optimization.
const PAGE_SIZE = 24;

export default function Gallery() {
  const { data } = useGalleryContent(undefined);
  const uploadImage = useUploadGalleryImage();
  const deleteImage = useDeleteGalleryImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const allImages = data?.images ?? [];
  const images = allImages.slice(0, visibleCount);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        await uploadImage.mutateAsync(file);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (url: string) => {
    try {
      await deleteImage.mutateAsync(url);
    } catch {
      toast.error('Failed to delete photo');
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Memories"
        title="Gallery"
        description="Your wedding moments, beautifully organized."
        action={
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-maroon-800 text-white rounded-lg text-sm font-medium hover:bg-maroon-900 transition-colors"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Upload photos
          </button>
        }
      />

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gridAutoFlow: 'dense',
        }}
      >
        {images.map((img, i) => (
          <GalleryCard
            key={img.url}
            url={img.url}
            index={i}
            onDelete={() => handleDelete(img.url)}
          />
        ))}

        <div
          onClick={() => fileRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-gold-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gold-400 hover:bg-gold-50 transition-colors"
          style={{ minHeight: 180 }}
        >
          {uploadImage.isPending ? (
            <p className="text-xs text-ink-dim">Uploading...</p>
          ) : (
            <>
              <HiOutlinePlus className="w-8 h-8 text-gold-300" />
              <p className="text-xs text-ink-dim">Add photos</p>
            </>
          )}
        </div>
      </div>

      {allImages.length > visibleCount && (
        <div className="text-center">
          <button
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="btn-outline"
            style={{ fontSize: 12, padding: '5px 14px' }}
          >
            Show {PAGE_SIZE} more ({images.length} of {allImages.length})
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {allImages.length === 0 && (
        <div className="text-center text-ink-dim text-sm py-8">
          No photos yet — upload your first one above.
        </div>
      )}
    </div>
  );
}
