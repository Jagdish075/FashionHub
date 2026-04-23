const apiBase = import.meta.env?.VITE_API_URL || 'http://localhost:5001'

export const getImageUrl = (raw) => {
  const value = String(raw || '').trim()
  if (!value) return ''

  // absolute URL
  if (/^https?:\/\//i.test(value)) {
    // rewrite localhost upload URLs to current API base to avoid stale port mismatch
    if (value.includes('/uploads/')) {
      try {
        const uploadPath = value.substring(value.indexOf('/uploads/'))
        return `${apiBase}${uploadPath}`
      } catch {
        return value
      }
    }
    return value
  }

  // relative uploads path
  if (value.startsWith('/uploads/')) {
    return `${apiBase}${value}`
  }

  // bare filename saved in DB
  if (!value.includes('/')) {
    return `${apiBase}/uploads/${value}`
  }

  return value
}

export const setImageFallback = (event) => {
  event.currentTarget.onerror = null
  event.currentTarget.src =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%25" height="100%25" fill="%23f3f4f6"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial,sans-serif" font-size="16">Image Unavailable</text></svg>'
}
