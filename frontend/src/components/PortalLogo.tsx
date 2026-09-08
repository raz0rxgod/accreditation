/**
 * Логотип портала аккредитации для шапок сайта — нейтральная иконка-бейдж,
 * без сторонней символики. Замените на свой логотип при необходимости.
 */
export function PortalLogo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="22" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2" />
      <path
        d="M24 12l9 4v6c0 6.4-3.9 11.6-9 13-5.1-1.4-9-6.6-9-13v-6l9-4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path d="M20 24l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
