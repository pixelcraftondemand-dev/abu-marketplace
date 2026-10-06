import HomePage from "./HomePage";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    // Title/description fall through to the root layout's defaults.
    alternates: { canonical: `https://www.abumarketplace.shop/${locale}` },
  };
}

export default async function Page({ params }) {
  const { locale } = await params;
  return <HomePage locale={locale} />;
}
