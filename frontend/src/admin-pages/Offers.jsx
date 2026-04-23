import React, { useCallback, useEffect, useState } from 'react'
import API from '../utils/api'

const initialForm = {
  title: '',
  description: '',
  discountPercentage: 10,
  bannerText: '',
  products: [],
  isActive: true
}

const Offers = () => {
  const [offers, setOffers] = useState([])
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchProducts = async () => {
    const { data } = await API.get('/api/admin/products')
    setProducts(Array.isArray(data) ? data : [])
  }

  const fetchOffers = async () => {
    const { data } = await API.get('/api/admin/offers')
    setOffers(Array.isArray(data) ? data : [])
  }

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      await Promise.all([fetchProducts(), fetchOffers()])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load offers data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
  }

  const toggleProduct = (productId) => {
    setForm((prev) => {
      const exists = prev.products.includes(productId)
      return {
        ...prev,
        products: exists
          ? prev.products.filter((id) => id !== productId)
          : [...prev.products, productId]
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        bannerText: form.bannerText.trim(),
        discountPercentage: Number(form.discountPercentage),
        products: form.products,
        isActive: Boolean(form.isActive)
      }

      if (editingId) {
        await API.put(`/api/admin/offers/${editingId}`, payload)
      } else {
        await API.post('/api/admin/offers', payload)
      }

      resetForm()
      await fetchOffers()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save offer')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (offer) => {
    setEditingId(offer._id)
    setForm({
      title: offer.title || '',
      description: offer.description || '',
      bannerText: offer.bannerText || '',
      discountPercentage: offer.discountPercentage ?? 10,
      products: Array.isArray(offer.products)
        ? offer.products.map((p) => (typeof p === 'string' ? p : p._id))
        : [],
      isActive: !!offer.isActive
    })
  }

  const handleDelete = async (id) => {
    try {
      await API.delete(`/api/admin/offers/${id}`)
      await fetchOffers()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete offer')
    }
  }

  const toggleActive = async (offer) => {
    try {
      await API.put(`/api/admin/offers/${offer._id}`, { isActive: !offer.isActive })
      await fetchOffers()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update offer status')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Offers Management</h1>
        <p className="text-gray-500">Select products, apply discount, and publish offer</p>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      <div className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">{editingId ? 'Edit Offer' : 'Create Offer'}</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Offer title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
            required
          />

          <input
            type="number"
            placeholder="Discount %"
            min="1"
            max="100"
            value={form.discountPercentage}
            onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })}
            className="rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
            required
          />

          <input
            type="text"
            placeholder="Banner text (optional)"
            value={form.bannerText}
            onChange={(e) => setForm({ ...form, bannerText: e.target.value })}
            className="rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 md:col-span-2"
          />

          <textarea
            placeholder="Offer description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 md:col-span-2"
            rows={3}
          />

          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-medium text-gray-700">Select Products *</p>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 p-3">
              {products.length === 0 ? (
                <p className="text-sm text-gray-500">No products found.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {products.map((product) => {
                    const checked = form.products.includes(product._id)
                    return (
                      <label
                        key={product._id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                          checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(product._id)}
                        />
                        <span className="truncate">{product.title}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>

          <div className="flex gap-3 md:justify-end">
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? 'Saving...' : editingId ? 'Update Offer' : 'Add Offer'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">All Offers</h2>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">Loading offers...</div>
        ) : offers.length === 0 ? (
          <div className="p-6 text-gray-500">No offers found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {offers.map((offer) => (
              <div key={offer._id} className="flex flex-col gap-3 px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">{offer.title}</p>
                    {offer.description ? <p className="text-sm text-gray-600">{offer.description}</p> : null}
                    <p className="text-sm text-gray-500">
                      {offer.discountPercentage}% OFF {offer.bannerText ? `• ${offer.bannerText}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Products: {(offer.products || []).map((p) => (typeof p === 'string' ? p : p.title)).join(', ') || 'None'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        offer.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {offer.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => toggleActive(offer)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                      Toggle
                    </button>
                    <button onClick={() => startEdit(offer)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(offer._id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Offers
