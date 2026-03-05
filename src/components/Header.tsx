import { useI18n } from '../i18n/context.tsx';
import type { Locale } from '../i18n/context.tsx';

export function Header() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div class="header">
      <div class="header-top">
        <a
          href="https://github.com/blhsrwznrghfzpr/resonite-profile"
          target="_blank"
          class="github-link"
        >
          GitHub
        </a>
        <select
          class="language-select"
          value={locale}
          onChange={e =>
            setLocale((e.target as HTMLSelectElement).value as Locale)
          }
        >
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
      </div>
      <h1>{t.header.title}</h1>
      <p>{t.header.subtitle}</p>
    </div>
  );
}
