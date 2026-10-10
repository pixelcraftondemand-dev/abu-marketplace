// One-off helper: append the `classifieds` namespace to a locale file while
// preserving its existing CRLF line endings and 2-space indentation exactly.
import { readFileSync, writeFileSync } from "node:fs";

const en = {
  browse: {
    title: "Buy and sell in Sierra Leone",
    subtitle: "Fresh listings from people and shops across the country.",
    resultCount: "{count} listings",
    resultCountOne: "1 listing",
    empty: "No listings match your search yet.",
    emptyHint: "Try a wider price range, another district, or clear your filters.",
    featured: "Featured listings",
    allListings: "All listings",
    safetyHeading: "Buying safely on ABU",
  },
  filters: {
    search: "Search",
    searchPlaceholder: "What are you looking for?",
    apply: "Search",
    more: "Filters",
    category: "Category",
    allCategories: "All categories",
    district: "District",
    allDistricts: "All districts",
    town: "Town",
    allTowns: "All towns",
    condition: "Condition",
    anyCondition: "Any condition",
    conditionNew: "New",
    conditionUsed: "Used",
    conditionRefurbished: "Refurbished",
    priceRange: "Price (Le)",
    minPrice: "Minimum price",
    maxPrice: "Maximum price",
    min: "Min",
    max: "Max",
    sort: "Sort by",
    sortNewest: "Newest first",
    sortPriceAsc: "Price: low to high",
    sortPriceDesc: "Price: high to low",
    sortOldest: "Oldest first",
    clear: "Clear filters",
  },
  results: {
    loadMore: "Load more listings",
    loading: "Loading…",
    loadError: "Could not load more listings. Please try again.",
    showingCount: "Showing {shown} of {total}",
    endOfResults: "You have reached the end of the results.",
  },
  detail: {
    backToBrowse: "Back to listings",
    description: "Description",
    details: "Details",
    location: "Location",
    posted: "Posted",
    condition: "Condition",
    seller: "Seller",
    similar: "Similar listings",
    safety: "Stay safe when you buy",
    report: "Report listing",
    notFound: "This listing is no longer available.",
    notFoundHint: "It may have been sold or removed. Browse other listings instead.",
  },
  seller: {
    profileTitle: "{name}'s listings",
    memberSince: "Member since {date}",
    activeListings: "{count} available",
    noListings: "This seller has no available listings right now.",
    about: "About this seller",
    verified: "Verified",
  },
};

const kri = {
  browse: {
    title: "Bay ɛn sɛl na Salone",
    subtitle: "Nyurestin lɛstin frɔm pipul dɛm ɛn shap dɛm na ɔl di kɔntri.",
    resultCount: "{count} lɛstin dɛm",
    resultCountOne: "1 lɛstin",
    empty: "Nɔ lɛstin nɔ ɛksitos fɔ yu sak yet.",
    emptyHint: "Trai wan ɔda prais, ɔda distrik, ɔ klia yu filter dɛm.",
    featured: "Fichɔ lɛstin dɛm",
    allListings: "Ɔl lɛstin dɛm",
    safetyHeading: "Aw fɔ bay sef na ABU",
  },
  filters: {
    search: "Sarch",
    searchPlaceholder: "Wetin yu de luk fɔ?",
    apply: "Sarch",
    more: "Filter dɛm",
    category: "Kategori",
    allCategories: "Ɔl kategori",
    district: "Distrik",
    allDistricts: "Ɔl distrik",
    town: "Tɔwn",
    allTowns: "Ɔl tɔwn",
    condition: "Kɔndishɔn",
    anyCondition: "Ɛni kɔndishɔn",
    conditionNew: "Nyɛw",
    conditionUsed: "Dɔn yuz",
    conditionRefurbished: "Dɔn fiks",
    priceRange: "Prais (Le)",
    minPrice: "Smɔl prais",
    maxPrice: "Big prais",
    min: "Smɔl",
    max: "Big",
    sort: "Sɔt bay",
    sortNewest: "Nyɛw wan fɔs",
    sortPriceAsc: "Prais: lo go ɔp",
    sortPriceDesc: "Prais: ɔp go dɔn",
    sortOldest: "Ol wan fɔs",
    clear: "Klia filter dɛm",
  },
  results: {
    loadMore: "Lod mɔ lɛstin dɛm",
    loading: "De lod…",
    loadError: "I nɔ wok fɔ lod. Trai bak.",
    showingCount: "De sho {shown} pan {total}",
    endOfResults: "Yu dɔn rich di ɛnd.",
  },
  detail: {
    backToBrowse: "Go bak na lɛstin dɛm",
    description: "Diskripshɔn",
    details: "Ditel dɛm",
    location: "Lokeshɔn",
    posted: "Pɔst",
    condition: "Kɔndishɔn",
    seller: "Sɛla",
    similar: "Lɛstin dɛm we fiba",
    safety: "Hɔl yu sef we yu de bay",
    report: "Ripɔt lɛstin",
    notFound: "Dis lɛstin nɔ de nɔmɔ.",
    notFoundHint: "A dɔn sɛl ɔ pul am. Luk ɔda lɛstin dɛm.",
  },
  seller: {
    profileTitle: "Lɛstin dɛm bilɔŋ {name}",
    memberSince: "I dɔn de sin {date}",
    activeListings: "{count} de avielebul",
    noListings: "Dis sɛla nɔ gɛt lɛstin nɔmɔ.",
    about: "Bɔt dis sɛla",
    verified: "Dɔn vɛrifai",
  },
};

function appendNamespace(file, block) {
  const text = readFileSync(file, "utf8");
  const marker = "\r\n  }\r\n}";
  const index = text.lastIndexOf(marker);
  if (index === -1) throw new Error(`Could not find root-close marker in ${file}`);

  const body = JSON.stringify(block, null, 2)
    .split("\n")
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join("\r\n");

  const next =
    text.slice(0, index) +
    "\r\n  },\r\n  \"classifieds\": " +
    body +
    text.slice(index + "\r\n  }".length);
  writeFileSync(file, next);
  return JSON.parse(next).classifieds ? "ok" : "failed-validation";
}

console.log("en:", appendNamespace("locales/en/common.json", en));
console.log("kri:", appendNamespace("locales/kri/common.json", kri));
