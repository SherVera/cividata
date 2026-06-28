interface AppLogoProps {
  className?: string;
  alt?: string;
}

/** Logo institucional servido desde /public/logo.svg */
export default function AppLogo({
  className = 'h-8 w-auto',
  alt = 'Censo Infantil',
}: AppLogoProps) {
  return (
    <img
      src="/logo.svg"
      alt={alt}
      className={className}
      width={600}
      height={327}
      decoding="async"
    />
  );
}
