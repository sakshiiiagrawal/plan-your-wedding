import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { supabase } from '../config/database';
import { withPgClient } from '../config/postgres';
import { NotFoundError, BadRequestError } from '../shared/errors/HttpError';
import { detectReceiptType, RECEIPT_CONTENT_TYPES } from '../utils/receiptType';
import type { PaymentAttachmentRow } from '../../../shared/src';

const BUCKET = 'wedding-media';

type DbRow = Record<string, unknown>;

function mapAttachmentRow(row: DbRow): PaymentAttachmentRow {
  return {
    id: String(row['id']),
    payment_id: String(row['payment_id']),
    url: String(row['url']),
    filename: String(row['filename']),
    mime_type: String(row['mime_type']),
    size_bytes: Number(row['size_bytes']),
    created_at: String(row['created_at']),
  };
}

async function assertPaymentOwnership(
  client: PoolClient,
  ownerId: string,
  paymentId: string,
): Promise<void> {
  const { rows } = await client.query<DbRow>(
    `
      SELECT p.id
      FROM payments p
      JOIN expenses e ON e.id = p.expense_id
      WHERE p.id = $1
        AND e.user_id = $2
    `,
    [paymentId, ownerId],
  );
  if (!rows[0]) throw new NotFoundError('Payment not found');
}

export async function listPaymentAttachments(
  ownerId: string,
  paymentId: string,
): Promise<PaymentAttachmentRow[]> {
  return withPgClient(async (client) => {
    await assertPaymentOwnership(client, ownerId, paymentId);
    const { rows } = await client.query<DbRow>(
      `SELECT * FROM payment_attachments WHERE payment_id = $1 ORDER BY created_at DESC`,
      [paymentId],
    );
    return rows.map(mapAttachmentRow);
  });
}

export async function uploadPaymentAttachment(
  ownerId: string,
  paymentId: string,
  file: Express.Multer.File,
): Promise<PaymentAttachmentRow> {
  return withPgClient(async (client) => {
    await assertPaymentOwnership(client, ownerId, paymentId);

    const receiptType = detectReceiptType(file.buffer);
    if (!receiptType) {
      throw new BadRequestError('Only JPG, PNG, WebP, GIF, or PDF receipts are allowed');
    }

    const path = `${ownerId}/payment-receipts/${paymentId}/${randomUUID()}.${receiptType}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: RECEIPT_CONTENT_TYPES[receiptType] });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { rows } = await client.query<DbRow>(
      `
        INSERT INTO payment_attachments (payment_id, url, filename, mime_type, size_bytes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [paymentId, publicUrl, file.originalname, RECEIPT_CONTENT_TYPES[receiptType], file.size],
    );
    return mapAttachmentRow(rows[0] ?? {});
  });
}

function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

export async function deletePaymentAttachment(
  ownerId: string,
  attachmentId: string,
): Promise<void> {
  return withPgClient(async (client) => {
    const { rows } = await client.query<DbRow>(
      `
        SELECT a.url
        FROM payment_attachments a
        JOIN payments p ON p.id = a.payment_id
        JOIN expenses e ON e.id = p.expense_id
        WHERE a.id = $1
          AND e.user_id = $2
      `,
      [attachmentId, ownerId],
    );
    const row = rows[0];
    if (!row) throw new NotFoundError('Attachment not found');

    const path = storagePathFromUrl(String(row['url']));
    if (path && path.startsWith(`${ownerId}/`)) {
      await supabase.storage.from(BUCKET).remove([path]);
    }

    await client.query(`DELETE FROM payment_attachments WHERE id = $1`, [attachmentId]);
  });
}
