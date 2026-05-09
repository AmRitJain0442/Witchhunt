type CloudFieldProps = {
  variant?: 'hero' | 'soft' | 'dawn' | 'meadow';
  className?: string;
};

type CloudSpec = {
  tone: string;
  size: number;
  top: number | string;
  left: number | string;
  drift: number;
  opacity: number;
};

const variants: Record<NonNullable<CloudFieldProps['variant']>, CloudSpec[]> = {
  hero: [
    { tone: 'peach', size: 520, top: -120, left: -80, drift: 1, opacity: 0.85 },
    { tone: 'sky', size: 460, top: 40, left: '62%', drift: 2, opacity: 0.7 },
    { tone: 'butter', size: 360, top: 280, left: '18%', drift: 3, opacity: 0.65 },
    { tone: 'sage', size: 540, top: 360, left: '70%', drift: 1, opacity: 0.55 },
    { tone: 'lilac', size: 320, top: 520, left: '8%', drift: 2, opacity: 0.5 },
  ],
  soft: [
    { tone: 'sky', size: 460, top: -80, left: -60, drift: 2, opacity: 0.55 },
    { tone: 'sage', size: 380, top: 200, left: '70%', drift: 3, opacity: 0.5 },
    { tone: 'peach', size: 320, top: 460, left: '38%', drift: 1, opacity: 0.45 },
  ],
  dawn: [
    { tone: 'peach', size: 540, top: -80, left: '50%', drift: 2, opacity: 0.7 },
    { tone: 'rose', size: 380, top: 200, left: '8%', drift: 3, opacity: 0.55 },
    { tone: 'butter', size: 420, top: 320, left: '70%', drift: 1, opacity: 0.55 },
  ],
  meadow: [
    { tone: 'sage', size: 480, top: -60, left: '8%', drift: 3, opacity: 0.55 },
    { tone: 'sky', size: 380, top: 240, left: '64%', drift: 1, opacity: 0.5 },
    { tone: 'butter', size: 320, top: 480, left: '24%', drift: 2, opacity: 0.4 },
  ],
};

export default function CloudField({ variant = 'hero', className = '' }: CloudFieldProps) {
  const clouds = variants[variant];
  return (
    <div className={`cloud-layer ${className}`} aria-hidden>
      {clouds.map((c, i) => (
        <span
          key={i}
          className={`cloud cloud--${c.tone} drift-${c.drift}`}
          style={{
            width: c.size,
            height: c.size,
            top: typeof c.top === 'number' ? `${c.top}px` : c.top,
            left: typeof c.left === 'number' ? `${c.left}px` : c.left,
            opacity: c.opacity,
            animationDelay: `${i * -3.5}s`,
          }}
        />
      ))}
    </div>
  );
}
