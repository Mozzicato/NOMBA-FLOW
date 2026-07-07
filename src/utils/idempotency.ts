import { randomUUID } from 'node:crypto';

export function normalizeReference(reference: string): string {
  return reference.trim().toLowerCase();
}

export function buildIdempotencyKey(reference?: string): string {
  if (reference && reference.trim().length > 0) {
    return normalizeReference(reference);
  }

  return randomUUID();
}
