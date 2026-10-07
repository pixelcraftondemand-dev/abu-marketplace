import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import {
  defaultLocale,
  getPreferredLocaleFromAcceptLanguage,
  supportedLocales,
} from '../lib/utils/locale';
import en from '../locales/en/common.json';
import kri from '../locales/kri/common.json';

const messagesByLocale = { en, kri };

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get('marketplaceLocale')?.value;
  const preferredLocale = getPreferredLocaleFromAcceptLanguage(
    headerStore.get('accept-language'),
  );
  const localeCode = cookieLocale || preferredLocale;
  const locale =
    supportedLocales.find((supportedLocale) => supportedLocale === localeCode) ??
    defaultLocale;

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
