import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Wraps a draggable list/grid item and hands its drag handle back via render
// prop, so the handle (a grip) can live anywhere inside the item's own markup.
export default function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (args: {
    handleProps: Record<string, unknown>;
    isDragging: boolean;
  }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.85 : 1,
        zIndex: isDragging ? 20 : undefined,
        position: 'relative',
      }}
    >
      {children({
        handleProps: {
          ...attributes,
          ...listeners,
          style: { cursor: 'grab', touchAction: 'none' },
          title: 'Drag to reorder',
        },
        isDragging,
      })}
    </div>
  );
}
