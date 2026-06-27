export const ROLES = ['owner', 'admin', 'shopify', 'amazon', 'user']

export function isOwner(role) {
  return role === 'owner' || role === 'admin'
}

export function canShopify(role) {
  return isOwner(role) || role === 'shopify' || role === 'user'
}

export function canAmazon(role) {
  return isOwner(role) || role === 'amazon' || role === 'user'
}

export function capabilities(role) {
  return {
    role,
    isOwner: isOwner(role),
    canShopify: canShopify(role),
    canAmazon: canAmazon(role),
  }
}

