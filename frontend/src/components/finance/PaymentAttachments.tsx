import { useRef } from 'react';
import { HiOutlineX, HiOutlineDocumentText, HiOutlineDocumentAdd } from 'react-icons/hi';
import toast from 'react-hot-toast';
import {
  usePaymentAttachments,
  useUploadPaymentAttachment,
  useDeletePaymentAttachment,
} from '../../hooks/useApi';

export default function PaymentAttachments({ paymentId }: { paymentId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: attachments = [] } = usePaymentAttachments(paymentId);
  const uploadAttachment = useUploadPaymentAttachment();
  const deleteAttachment = useDeletePaymentAttachment();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await uploadAttachment.mutateAsync({ paymentId, file });
    } catch {
      toast.error('Failed to upload receipt.');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteAttachment.mutateAsync({ paymentId, attachmentId });
    } catch {
      toast.error('Failed to delete receipt.');
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
      {attachments.map((attachment) => (
        <span
          key={attachment.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 100,
            background: 'var(--bg-raised)',
            color: 'var(--ink-low)',
          }}
        >
          <HiOutlineDocumentText style={{ width: 11, height: 11 }} />
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            {attachment.filename}
          </a>
          <button
            type="button"
            onClick={() => handleDeleteAttachment(attachment.id)}
            disabled={deleteAttachment.isPending}
            style={{ background: 'transparent', cursor: 'pointer', color: 'var(--err)', padding: 0 }}
          >
            <HiOutlineX style={{ width: 10, height: 10 }} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadAttachment.isPending}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10,
          padding: '2px 6px',
          borderRadius: 100,
          border: '1px dashed var(--line)',
          background: 'transparent',
          color: 'var(--ink-low)',
          cursor: 'pointer',
          opacity: uploadAttachment.isPending ? 0.5 : 1,
        }}
      >
        <HiOutlineDocumentAdd style={{ width: 11, height: 11 }} />
        {uploadAttachment.isPending ? 'Uploading…' : 'Add receipt'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
