// Tiny pub/sub for "added to cart" feedback.
//
// Product cards and the product detail page fire `emitAddedToCart(product)`
// after a successful add; the slide-up confirmation sheet (AddedToCartSheet)
// subscribes. This keeps the feedback decoupled from the Redux cart slice —
// the sheet shows the actual product (image, name, price), which the slice
// only tracks by productId.

const listeners = new Set();

export function emitAddedToCart(product) {
  if (!product) return;
  for (const listener of listeners) {
    try {
      listener(product);
    } catch (error) {
      console.error("[cartEvents] listener failed:", error);
    }
  }
}

export function onAddedToCart(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
