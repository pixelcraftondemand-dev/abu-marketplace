interface StoreLinkParams {
  isSignedIn: boolean;
  isSeller: boolean;
}

export function getStoreLinkTarget({ isSignedIn, isSeller }: StoreLinkParams): string {
  if (!isSignedIn) {
    return "/create-store";
  }

  if (!isSeller) {
    return "/create-store";
  }

  return "/store/dashboard";
}
