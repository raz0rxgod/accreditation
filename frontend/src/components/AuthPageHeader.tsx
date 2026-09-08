import { PortalLogo } from '@/components/PortalLogo';
import { ORG_FULL_NAME } from '@/lib/brand';

/** Логотип + полное название ведомства над формой на страницах входа/регистрации/подтверждения. */
export function AuthPageHeader() {
  return (
    <div className="flex flex-col items-center gap-3 mb-6 text-center">
      <PortalLogo className="h-14 w-14 text-primary" />
      <span className="font-serif text-base sm:text-lg leading-tight text-ink max-w-xs">{ORG_FULL_NAME}</span>
    </div>
  );
}
