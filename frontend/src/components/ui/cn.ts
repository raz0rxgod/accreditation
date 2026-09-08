// Маленький хелпер для условной склейки classNames — без внешней зависимости
// (в этом проекте не установлен clsx/classnames, добавлять ради одной функции
// смысла нет).
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
