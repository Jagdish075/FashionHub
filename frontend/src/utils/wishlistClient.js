import API from './api'

const ENDPOINTS = ['/api/wishlist', '/wishlist', '/api/api/wishlist']

const getUserKey = () => {
  try {
    const raw = sessionStorage.getItem('user')
    const user = raw ? JSON.parse(raw) : null
    return `fh_wishlist_${user?._id || user?.id || 'guest'}`
  } catch {
    return 'fh_wishlist_guest'
  }
}

const readLocalWishlist = () => {
  try {
    const raw = localStorage.getItem(getUserKey())
    const ids = raw ? JSON.parse(raw) : []
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

const writeLocalWishlist = (ids) => {
  localStorage.setItem(getUserKey(), JSON.stringify(ids))
}

const normalizeApiItems = (data) => (data?.items || []).map((item) => item.product).filter(Boolean)

const tryApiGetWishlist = async () => {
  let lastErr
  for (const endpoint of ENDPOINTS) {
    try {
      const { data } = await API.get(endpoint)
      return { items: normalizeApiItems(data), source: 'api' }
    } catch (err) {
      lastErr = err
      if (err.response?.status !== 404) throw err
    }
  }
  if (lastErr?.response?.status === 404) {
    const ids = readLocalWishlist()
    const products = await Promise.all(
      ids.map(async (id) => {
        try {
          const { data } = await API.get(`/api/products/${id}`)
          return data
        } catch {
          return null
        }
      })
    )
    return { items: products.filter(Boolean), source: 'local' }
  }
  throw lastErr
}

const tryApiAddWishlist = async (productId) => {
  let lastErr
  for (const endpoint of ENDPOINTS) {
    try {
      await API.post(`${endpoint}/${productId}`)
      return { source: 'api' }
    } catch (err) {
      lastErr = err
      if (err.response?.status !== 404) throw err
    }
  }

  if (lastErr?.response?.status === 404) {
    const ids = readLocalWishlist()
    if (!ids.includes(productId)) ids.unshift(productId)
    writeLocalWishlist(ids)
    return { source: 'local' }
  }

  throw lastErr
}

const tryApiRemoveWishlist = async (productId) => {
  let lastErr
  for (const endpoint of ENDPOINTS) {
    try {
      await API.delete(`${endpoint}/${productId}`)
      return { source: 'api' }
    } catch (err) {
      lastErr = err
      if (err.response?.status !== 404) throw err
    }
  }

  if (lastErr?.response?.status === 404) {
    const ids = readLocalWishlist().filter((id) => id !== productId)
    writeLocalWishlist(ids)
    return { source: 'local' }
  }

  throw lastErr
}

const isInLocalWishlist = (productId) => readLocalWishlist().includes(productId)

export { tryApiGetWishlist, tryApiAddWishlist, tryApiRemoveWishlist, isInLocalWishlist }
