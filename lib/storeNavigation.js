export function getStoreLinkTarget({ isSignedIn, isSeller, storeUsername }) {
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
