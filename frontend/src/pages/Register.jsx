import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import API from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[6-9]\d{9}$/
const NAME_REGEX = /^[a-zA-Z\s\-']+$/
const getSafeRedirectPath = (value, fallback = '/') => {
  if (!value || typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (value.startsWith('/login') || value.startsWith('/register')) return fallback
  return value
}

const getRegistrationErrors = (form) => {
  const errors = {}
  const name = form.name.trim()
  const phone = form.phone.trim()
  const email = form.email.trim().toLowerCase()
  const password = form.password
  const confirmPassword = form.confirmPassword

  if (!name) errors.name = 'Name is required'
  else if (name.length < 2 || name.length > 50) errors.name = 'Name must be between 2 and 50 characters'
  else if (!NAME_REGEX.test(name)) errors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes'

  if (!phone) errors.phone = 'Phone number is required'
  else if (!PHONE_REGEX.test(phone)) errors.phone = 'Please enter a valid 10-digit phone number'

  if (!email) errors.email = 'Email is required'
  else if (!EMAIL_REGEX.test(email)) errors.email = 'Please enter a valid email address'

  if (!password) errors.password = 'Password is required'
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters'
  else if (password.length > 128) errors.password = 'Password must be less than 128 characters'
  else if (!/\d/.test(password)) errors.password = 'Password must contain at least one number'

  if (!confirmPassword) errors.confirmPassword = 'Confirm password is required'
  else if (password !== confirmPassword) errors.confirmPassword = "Passwords don't match"

  return errors
}

const Register = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuthData } = useAuth()

  const redirectTo = getSafeRedirectPath(searchParams.get('redirect'))

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const passwordHint = useMemo(() => {
    if (!form.password) return ''
    if (form.password.length < 6) return 'Password must be at least 6 characters.'
    if (!/\d/.test(form.password)) return 'Password must include at least one number.'
    return ''
  }, [form.password])

  const handleChange = (e) => {
    const { name, value } = e.target
    const normalizedValue =
      name === 'phone'
        ? value.replace(/\D/g, '').slice(0, 10)
        : name === 'email'
          ? value.trimStart().toLowerCase()
          : value

    setForm((prev) => ({ ...prev, [name]: normalizedValue }))
    setError('')
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validateDetails = () => {
    const errors = getRegistrationErrors(form)
    setFieldErrors(errors)
    return Object.values(errors)[0] || ''
  }

  const handleBlur = (e) => {
    const { name } = e.target
    const errors = getRegistrationErrors(form)
    setFieldErrors((prev) => ({ ...prev, [name]: errors[name] || '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationError = validateDetails()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setLoading(true)
      setError('')

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      }

      const { data } = await API.post('/api/users/register', payload)
      setAuthData(data.token, data.user)
      toast.success(data?.message || 'Account created successfully!')
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create account'
      const field = err.response?.data?.field
      setError(message)
      if (field) {
        setFieldErrors((prev) => ({ ...prev, [field]: message }))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">Create Your FationHub Account</h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Fill in your details to create your account
        </p>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              placeholder="Full name"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none disabled:bg-gray-100"
            />
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              maxLength={10}
              placeholder="Phone number"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none disabled:bg-gray-100"
            />
          </div>
          {(fieldErrors.name || fieldErrors.phone) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <p className="text-xs text-red-600">{fieldErrors.name || ' '}</p>
              <p className="text-xs text-red-600">{fieldErrors.phone || ' '}</p>
            </div>
          )}

          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            type="email"
            placeholder="Email address"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none disabled:bg-gray-100"
          />
          {fieldErrors.email && <p className="text-xs text-red-600 -mt-2">{fieldErrors.email}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              type="password"
              placeholder="Password"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none disabled:bg-gray-100"
            />
            <input
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              type="password"
              placeholder="Confirm password"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none disabled:bg-gray-100"
            />
          </div>
          {(fieldErrors.password || fieldErrors.confirmPassword) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <p className="text-xs text-red-600">{fieldErrors.password || ' '}</p>
              <p className="text-xs text-red-600">{fieldErrors.confirmPassword || ' '}</p>
            </div>
          )}

          {passwordHint && (
            <p className="text-xs text-amber-700">{passwordHint}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm mt-4 text-gray-600">
          By creating an account you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  )
}

export default Register
