interface ColorDotsProps {
  colors: string[];
  fallback?: string;
}

export function ColorDots({ colors, fallback = '#6366f1' }: ColorDotsProps) {
  const display = colors.length > 0 ? colors.slice(0, 3) : [fallback];

  return (
    <span className="inline-flex shrink-0 gap-0.5">
      {display.map((c, i) => (
        <span
          key={i}
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}
