import { APP_NAME } from '../brand';

type AppLogoVariant = 'primary' | 'reverse';

interface AppLogoProps {
  className?: string;
  alt?: string;
  /** `primary` sobre fondo claro; `reverse` sobre fondo oscuro. */
  variant?: AppLogoVariant;
}

const LOGO_SOURCES: Record<AppLogoVariant, string> = {
  primary: '/logo.svg',
  reverse: '/logo-reverse.svg',
};

/** Logo horizontal Cividata servido desde /public. */
export default function AppLogo({
  className = 'h-8 w-auto',
  alt = APP_NAME,
  variant = 'primary',
}: AppLogoProps) {
  return (
    <img
      src={LOGO_SOURCES[variant]}
      alt={alt}
      className={className}
      width={427}
      height={143}
      decoding="async"
    />
  );
}
