interface StoreLinkParams {
  isSignedIn: boolean;
  isSeller: boolean;
  storeUsername?: string | null;
}

export function getStoreLinkTarget({ isSignedIn, isSeller, storeUsername }: StoreLinkParams): string {
  if (!isSignedIn) {
    return "/sign-in";
  }

  if (!isSeller) {
    return "/create-store";
  }

  if (storeUsername) {
    return `/shop/${storeUsername}`;
  }

  return "/store";
}
