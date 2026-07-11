const RECENTLY_VIEWED_KEY = 'abu-recently-viewed'
const MAX_ITEMS = 12

export function getRecentlyViewed() {
    if (typeof window === 'undefined') return []
    try {
        const stored = localStorage.getItem(RECENTLY_VIEWED_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

export function addRecentlyViewed(productId) {
    if (typeof window === 'undefined') return
    const current = getRecentlyViewed().filter((id) => id !== productId)
    const updated = [productId, ...current].slice(0, MAX_ITEMS)
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
}
