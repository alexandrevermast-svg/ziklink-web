export function ZikLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-3xl' };
  return (
    <span
      className={`${sizes[size]} font-bold zik-gradient-text`}
      style={{ letterSpacing: '-0.03em' }}
    >
      ZikLink
    </span>
  );
}