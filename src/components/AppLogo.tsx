import { APP_NAME } from '../brand';

interface AppLogoProps {
  className?: string;
  alt?: string;
}

/** Logo institucional servido desde /public/logo.svg */
export default function AppLogo({
  className = 'h-8 w-auto',
  alt = APP_NAME,
}: AppLogoProps) {
  return (
    <img
      src="/logo.svg"
      alt={alt}
      className={className}
      width={326}
      height={333}
      decoding="async"
    />
  );
}
