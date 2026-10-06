// Tiny pub/sub for "added to cart" feedback.
//
// Product cards and the product detail page fire `emitAddedToCart(product)`
// after a successful add; the slide-up confirmation sheet (AddedToCartSheet)
// subscribes. This keeps the feedback decoupled from the Redux cart slice —
// the sheet shows the actual product (image, name, price), which the slice
// only tracks by productId.

interface CartProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity?: number;
}

type CartListener = (product: CartProduct) => void;

const listeners = new Set<CartListener>();

export function emitAddedToCart(product: CartProduct): void {
  if (!product) return;
  for (const listener of listeners) {
    try {
      listener(product);
    } catch (error) {
      console.error("[cartEvents] listener failed:", error);
    }
  }
}

export function onAddedToCart(listener: CartListener): () => boolean {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
