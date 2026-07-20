// Guests use the `mutual` enum value, expenses/payments use `shared` — two
// different DB enums for the same idea. Rather than migrate either enum,
// every page displays both as "Shared" so the UI vocabulary matches even
// though the underlying value differs by domain.
const SIDE_LABELS: Record<string, string> = {
  bride: 'Bride',
  groom: 'Groom',
  shared: 'Shared',
  mutual: 'Shared',
  mixed: 'Mixed',
};

export function sideLabel(value: string): string {
  return SIDE_LABELS[value] ?? value;
}
