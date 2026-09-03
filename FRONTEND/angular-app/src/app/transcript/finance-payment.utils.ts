import type { TranscriptPaymentRequest } from './transcript-payment.model';

export function normalizeRequestTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function sortTranscriptRequestsForFinance<T extends Pick<TranscriptPaymentRequest, 'requestedAt'>>(
  requests: T[]
): T[] {
  return [...requests].sort((first, second) => {
    return normalizeRequestTimestamp(second.requestedAt) - normalizeRequestTimestamp(first.requestedAt);
  });
}
