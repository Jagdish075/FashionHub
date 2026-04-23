/**
 * Cashfree Payment Gateway Service
 * 
 * This service handles all Cashfree payment operations.
 * Uses TEST/SANDBOX environment only - NO live payments.
 * 
 * Required Environment Variables:
 * - CASHFREE_APP_ID: Your Cashfree App ID (test)
 * - CASHFREE_CLIENT_SECRET: Your Cashfree Client Secret (test)
 * - CASHFREE_ENVIRONMENT: 'sandbox' (always use sandbox)
 */

import crypto from 'crypto';

const getRuntimeConfig = () => ({
  appId: (process.env.CASHFREE_APP_ID || '').trim() || 'your_test_app_id',
  clientSecret: (process.env.CASHFREE_CLIENT_SECRET || '').trim() || 'your_test_client_secret',
  environment: (process.env.CASHFREE_ENVIRONMENT || 'sandbox').trim(),
  apiVersion: (process.env.CASHFREE_API_VERSION || '2025-01-01').trim()
});

const isPlaceholderCredential = (value) => {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === 'your_test_app_id' ||
    normalized === 'your_test_client_secret' ||
    normalized === 'test_app_id' ||
    normalized === 'test_client_secret' ||
    normalized === 'changeme'
  );
};

// Cashfree API endpoints
const CASHFREE_ENDPOINTS = {
  sandbox: {
    baseUrl: 'https://sandbox.cashfree.com/pg/orders'
  },
  production: {
    baseUrl: 'https://api.cashfree.com/pg/orders'
  }
};

// Get current environment configuration
const getEndpoint = (environment) => CASHFREE_ENDPOINTS[environment] || CASHFREE_ENDPOINTS.sandbox;

const parseGatewayResponse = async (response) => {
  const raw = await response.text()
  let parsed = null
  try {
    parsed = raw ? JSON.parse(raw) : null
  } catch {
    parsed = null
  }
  return { raw, parsed }
}

/**
 * Generate signature for Cashfree API requests
 * @param {string} secretKey - Client secret key
 * @param {object} data - Data to sign
 * @returns {string} - HMAC signature
 */
const generateSignature = (secretKey, data) => {
  const sortedKeys = Object.keys(data).sort();
  const signatureData = sortedKeys
    .map(key => `${key}=${data[key]}`)
    .join('');
  
  return crypto
    .createHmac('sha256', secretKey)
    .update(signatureData)
    .digest('base64');
};

/**
 * Create a new payment order with Cashfree
 * 
 * @param {object} orderData - Order details
 * @param {string} orderData.orderId - Unique order ID
 * @param {number} orderData.orderAmount - Order total amount
 * @param {string} orderData.customerName - Customer name
 * @param {string} orderData.customerEmail - Customer email
 * @param {string} orderData.customerPhone - Customer phone
 * @param {string} orderData.orderNote - Order note (optional)
 * @returns {Promise<object>} - Cashfree order response
 */
export const createCashfreeOrder = async (orderData) => {
  const { appId, clientSecret, environment, apiVersion } = getRuntimeConfig();
  const { orderId, orderAmount, customerName, customerEmail, customerPhone, orderNote } = orderData;
  // Validate environment
  if (isPlaceholderCredential(appId) || isPlaceholderCredential(clientSecret)) {
    const err = new Error('Cashfree credentials are placeholders. Use real sandbox CASHFREE_APP_ID and CASHFREE_CLIENT_SECRET from Cashfree dashboard.')
    err.details = { appId, environment }
    console.error('[Cashfree] Missing credentials', err.details)
    throw err
  }
  
  const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const backendBaseUrl = (process.env.BACKEND_URL || 'http://localhost:5001').replace(/\/+$/, '');
  const frontendHost = frontendBaseUrl.replace(/^https?:\/\//, '').toLowerCase()
  const backendHost = backendBaseUrl.replace(/^https?:\/\//, '').toLowerCase()
  const isLocalFrontend =
    frontendHost.startsWith('localhost') ||
    frontendHost.startsWith('127.0.0.1')
  const isLocalBackend =
    backendHost.startsWith('localhost') ||
    backendHost.startsWith('127.0.0.1')
  const normalizedPhone = String(customerPhone || '')
    .replace(/\D/g, '')
    .slice(-10);
  const safePhone = normalizedPhone.length === 10 ? normalizedPhone : '9999999999';
  const safeAmount = Number(orderAmount);

  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    const err = new Error('Invalid order amount for payment')
    err.details = { orderAmount }
    throw err
  }

  // Prepare request body for new Cashfree API
  const requestBody = {
    order_id: orderId,
    order_amount: Number(safeAmount.toFixed(2)),
    order_currency: 'INR',
    customer_details: {
      customer_id: `customer_${Date.now()}`, // Generate unique customer ID
      customer_phone: safePhone
    },
    order_note: orderNote || ''
  };
  if (customerName) requestBody.customer_details.customer_name = customerName
  if (customerEmail) requestBody.customer_details.customer_email = customerEmail
  // In localhost development, avoid order_meta URL validation issues on gateway.
  if (!isLocalFrontend) {
    requestBody.order_meta = {
      return_url: `${frontendBaseUrl}/payment/success?order_id={order_id}`
    }
    if (!isLocalBackend) {
      requestBody.order_meta.notify_url = `${backendBaseUrl}/api/payments/callback`
    }
  }

  try {
    const endpoint = getEndpoint(environment);
    
    const response = await fetch(`${endpoint.baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-version': apiVersion,
        'x-client-id': appId,
        'x-client-secret': clientSecret
      },
      body: JSON.stringify(requestBody)
    });

    const { raw, parsed } = await parseGatewayResponse(response)
    const data = parsed

    if (!response.ok) {
      const fallbackMsg = raw?.trim()?.startsWith('<')
        ? `Gateway returned non-JSON response (HTTP ${response.status})`
        : `Gateway error (HTTP ${response.status})`
      console.error('Cashfree API Error:', data || raw);
      const err = new Error(data?.message || fallbackMsg);
      // attach raw response for debugging in caller
      err.details = data || {
        status: response.status,
        statusText: response.statusText,
        raw: raw?.slice(0, 300)
      };
      throw err;
    }

    if (!data || !data.payment_session_id) {
      const err = new Error('Cashfree response missing payment_session_id')
      err.details = {
        status: response.status,
        statusText: response.statusText,
        raw: raw?.slice(0, 300)
      }
      throw err;
    }

    // Return payment session details only. Frontend must use Cashfree JS SDK.
    return {
      success: true,
      paymentSessionId: data.payment_session_id,
      orderId: orderId,
      orderAmount: orderAmount
    };
  } catch (error) {
    console.error('Cashfree Order Creation Error:', error);
    throw error;
  }
};

/**
 * Diagnose Cashfree connectivity/auth issues.
 * Returns raw upstream response metadata without creating an order.
 */
export const diagnoseCashfreeConnection = async () => {
  const { appId, clientSecret, environment, apiVersion } = getRuntimeConfig()
  const endpoint = getEndpoint(environment)

  const response = await fetch(`${endpoint.baseUrl}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-api-version': apiVersion,
      'x-client-id': appId,
      'x-client-secret': clientSecret
    }
  })

  const { raw, parsed } = await parseGatewayResponse(response)
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    endpoint: endpoint.baseUrl,
    isJson: Boolean(parsed),
    body: parsed || raw?.slice(0, 500) || '',
    config: {
      environment,
      apiVersion,
      appIdPreview: appId ? `${appId.slice(0, 6)}...${appId.slice(-4)}` : ''
    }
  }
}

/**
 * Verify payment status from Cashfree
 * 
 * @param {string} orderId - The order ID to verify
 * @returns {Promise<object>} - Payment status details
 */
export const verifyPayment = async (orderId) => {
  try {
    const { appId, clientSecret, environment, apiVersion } = getRuntimeConfig();
    const endpoint = getEndpoint(environment);
    
    const response = await fetch(`${endpoint.baseUrl}/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-version': apiVersion,
        'x-client-id': appId,
        'x-client-secret': clientSecret
      }
    });

    const { raw, parsed } = await parseGatewayResponse(response)
    const data = parsed

    if (!response.ok) {
      console.error('Cashfree Verification Error:', data || raw);
      const err = new Error(data?.message || `Failed to verify payment (HTTP ${response.status})`)
      err.details = data || {
        status: response.status,
        statusText: response.statusText,
        raw: raw?.slice(0, 300)
      }
      throw err
    }

    if (!data) {
      const err = new Error('Invalid verification response from gateway')
      err.details = {
        status: response.status,
        statusText: response.statusText,
        raw: raw?.slice(0, 300)
      }
      throw err
    }

    // Parse payment status from new API format
    let paymentStatus = 'failed';
    const orderStatus = data.order_status?.toUpperCase();
    
    switch (orderStatus) {
      case 'PAID':
        paymentStatus = 'success';
        break;
      case 'FAILED':
        paymentStatus = 'failed';
        break;
      case 'CANCELLED':
        paymentStatus = 'cancelled';
        break;
      case 'ACTIVE':
      case 'PENDING':
        paymentStatus = 'pending';
        break;
      default:
        paymentStatus = 'unknown';
    }

    // Get payment details from the payments array
    const payments = Array.isArray(data.payments) ? data.payments : [];
    const payment = payments.find(p => p.payment_status === 'SUCCESS') || payments[0];

    return {
      success: true,
      orderId: orderId,
      orderStatus: data.order_status || null,
      status: paymentStatus,
      paymentId: payment?.payment_id || null,
      amount: data.order_amount || null,
      paymentMethod: payment?.payment_method || null,
      bankReference: payment?.bank_reference || null,
      errorMessage: payment?.payment_error || null
    };
  } catch (error) {
    console.error('Cashfree Verification Error:', error);
    throw error;
  }
};

/**
 * Process payment callback from Cashfree webhook
 * 
 * @param {object} callbackData - Data received from Cashfree webhook
 * @param {string} signature - Signature from webhook header
 * @returns {object} - Processed callback result
 */
export const processCallback = (callbackData, signature) => {
  const { clientSecret } = getRuntimeConfig();
  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(JSON.stringify(callbackData))
    .digest('base64');

  if (signature !== expectedSignature) {
    console.error('Invalid webhook signature');
    return { valid: false, error: 'Invalid signature' };
  }

  return {
    valid: true,
    orderId: callbackData.order?.order_id,
    orderAmount: callbackData.order?.order_amount,
    paymentStatus: callbackData.order?.payment_status,
    transactionId: callbackData.transaction?.transaction_id,
    customerEmail: callbackData.order?.customer_email,
    timestamp: new Date()
  };
};

/**
 * Get order details from Cashfree
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<object>} - Order details
 */
export const getOrderDetails = async (orderId) => {
  try {
    const { appId, clientSecret, environment } = getRuntimeConfig();
    const endpoint = getEndpoint(environment);
    
    const response = await fetch(`${endpoint.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-01-01',
        'X-Client-Secret': clientSecret,
        'X-Client-Id': appId
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get order details');
    }

    return {
      success: true,
      order: data.order || data
    };
  } catch (error) {
    console.error('Cashfree Get Order Error:', error);
    throw error;
  }
};

/**
 * Refund a payment (for admin use)
 * 
 * @param {string} orderId - Order ID to refund
 * @param {number} refundAmount - Amount to refund (optional, defaults to full amount)
 * @param {string} refundNote - Reason for refund
 * @returns {Promise<object>} - Refund result
 */
export const refundPayment = async (orderId, refundAmount = null, refundNote = '') => {
  try {
    const { appId, clientSecret, environment } = getRuntimeConfig();
    const endpoint = getEndpoint(environment);
    
    // First get order details to find transaction ID
    const orderDetails = await getOrderDetails(orderId);
    const transactionId = orderDetails.order?.transaction_id;

    if (!transactionId) {
      throw new Error('No transaction found for this order');
    }

    const refundParams = {
      appId: appId,
      referenceId: transactionId,
      refundAmount: (refundAmount || orderDetails.order?.order_amount).toFixed(2),
      refundNote: refundNote || 'Customer requested refund'
    };

    const signature = generateSignature(clientSecret, refundParams);

    const response = await fetch(`${endpoint.baseUrl}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-01-01',
        'X-Client-Secret': clientSecret,
        'X-Client-Id': appId
      },
      body: JSON.stringify({
        ...refundParams,
        signature: signature
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to process refund');
    }

    return {
      success: true,
      refundId: data.refund?.refund_id,
      status: data.refund?.status,
      amount: data.refund?.refund_amount
    };
  } catch (error) {
    console.error('Cashfree Refund Error:', error);
    throw error;
  }
};

// Export service configuration info
export const getCashfreeConfig = () => ({
  appId: getRuntimeConfig().appId,
  environment: getRuntimeConfig().environment,
  isTestMode: getRuntimeConfig().environment === 'sandbox'
});

export default {
  createCashfreeOrder,
  diagnoseCashfreeConnection,
  verifyPayment,
  processCallback,
  getOrderDetails,
  refundPayment,
  getCashfreeConfig
};
