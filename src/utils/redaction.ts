const VISIBLE_CHARS = 4;

export function maskSecret(value: string): string {
  if (!value) {
    return '';
  }

  if (value.length <= VISIBLE_CHARS * 2) {
    return '*'.repeat(value.length);
  }

  const visibleStart = value.slice(0, VISIBLE_CHARS);
  const visibleEnd = value.slice(-VISIBLE_CHARS);
  const middleLength = value.length - VISIBLE_CHARS * 2;

  return `${visibleStart}${'*'.repeat(middleLength)}${visibleEnd}`;
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('authorization') ||
      lowerKey.includes('api-key') ||
      lowerKey.includes('public-key') ||
      lowerKey.includes('secret')
    ) {
      redacted[key] = maskSecret(value);
      continue;
    }

    redacted[key] = value;
  }

  return redacted;
}
