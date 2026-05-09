export function multiColorGradient(colors: string[], fallback = '#6366f1'): string {
  const list = colors.length > 0 ? colors.slice(0, 3) : [fallback];
  if (list.length === 1) return list[0];

  const step = 100 / list.length;
  const stops = list.flatMap((c, i) => [
    `${c} ${Math.round(i * step)}%`,
    `${c} ${Math.round((i + 1) * step)}%`,
  ]);
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
