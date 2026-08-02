export const withObjectParticle = (label: string): string => {
  const trimmed = label.trim();
  const last = trimmed.at(-1);
  if (!last) return label;
  const code = last.charCodeAt(0);
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;
  if (!isHangulSyllable) return `${label}을`;
  const hasFinalConsonant = (code - 0xac00) % 28 !== 0;
  return `${label}${hasFinalConsonant ? '을' : '를'}`;
};
