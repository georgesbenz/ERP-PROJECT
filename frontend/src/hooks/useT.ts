import { useLanguageStore } from '@/store/language.store';
import { getT } from '@/lib/i18n';

export function useT() {
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);
  return { t: getT(lang), lang, setLang };
}
