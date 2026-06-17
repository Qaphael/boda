const { redis } = require('../config/redis');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

const MTN_BASE_URL = process.env.MTN_TARGET_ENV === 'production'
  ? 'https://proxy.momoapi.mtn.com'
  : 'https://sandbox.momodeveloper.mtn.com';

const AIRTEL_BASE_URL = 'https://openapi.airtel.africa';

const detectNetwork = (phoneNumber) => {
  if (!phoneNumber || phoneNumber.length < 5) return 'UNKNOWN';

  const prefix = phoneNumber.slice(3, 5);
  const mtnPrefixes = ['76', '77', '78', '39'];
  const airtelPrefixes = ['70', '75', '74'];

  if (mtnPrefixes.includes(prefix)) return 'MTN';
  if (airtelPrefixes.includes(prefix)) return 'AIRTEL';
  return 'UNKNOWN';
};

const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
};

const getMtnToken = async () => {
  const cached = await redis.get('mtn:access_token');
  if (cached) return cached;

  if (!process.env.MTN_API_USER || !process.env.MTN_API_KEY) {
    throw new Error('MTN API credentials not configured');
  }

  const credentials = Buffer.from(
    `${process.env.MTN_API_USER}:${process.env.MTN_API_KEY}`
  ).toString('base64');

  const res = await fetch(
    `${MTN_BASE_URL}/collection/token/`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`MTN token request failed: ${res.status} - ${error}`);
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error('No access_token in MTN response');
  }

  const expiresIn = data.expires_in || 3600;
  await redis.setEx('mtn:access_token', expiresIn - 300, data.access_token);
  return data.access_token;
};

const mtnCollect = async (phoneNumber, amount, bookingId) => {
  return retryWithBackoff(async () => {
    const token = await getMtnToken();
    const referenceId = uuidv4();

    const res = await fetch(
      `${MTN_BASE_URL}/collection/v1_0/requesttopay`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': process.env.MTN_TARGET_ENV || 'sandbox',
          'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount.toString(),
          currency: 'UGX',
          externalId: bookingId,
          payer: {
            partyIdType: 'MSISDN',
            partyId: phoneNumber,
          },
          payerMessage: 'Boda ride payment',
          payeeNote: `Booking #${bookingId}`,
        }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`MTN collection failed: ${res.status} - ${error}`);
    }

    return referenceId;
  });
};

const mtnCheckStatus = async (referenceId) => {
  const token = await getMtnToken();

  const res = await fetch(
    `${MTN_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Target-Environment': process.env.MTN_TARGET_ENV || 'sandbox',
        'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`MTN status check failed: ${res.status} - ${error}`);
  }

  const data = await res.json();
  return data.status;
};

const mtnDisburse = async (riderPhone, amount, bookingId) => {
  return retryWithBackoff(async () => {
    const token = await getMtnToken();
    const referenceId = uuidv4();

    const res = await fetch(
      `${MTN_BASE_URL}/disbursement/v1_0/transfer`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Target-Environment': process.env.MTN_TARGET_ENV || 'sandbox',
          'Ocp-Apim-Subscription-Key': process.env.MTN_DISBURSEMENT_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount.toString(),
          currency: 'UGX',
          externalId: bookingId,
          payee: {
            partyIdType: 'MSISDN',
            partyId: riderPhone,
          },
          payerMessage: 'Boda earnings',
          payeeNote: 'Trip completed',
        }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`MTN disbursement failed: ${res.status} - ${error}`);
    }

    return referenceId;
  });
};

const getAirtelToken = async () => {
  const cached = await redis.get('airtel:access_token');
  if (cached) return cached;

  if (!process.env.AIRTEL_CLIENT_ID || !process.env.AIRTEL_CLIENT_SECRET) {
    throw new Error('Airtel API credentials not configured');
  }

  const res = await fetch(
    `${AIRTEL_BASE_URL}/auth/oauth2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AIRTEL_CLIENT_ID,
        client_secret: process.env.AIRTEL_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Airtel token request failed: ${res.status} - ${error}`);
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error('No access_token in Airtel response');
  }

  const expiresIn = data.expires_in || 3600;
  await redis.setEx('airtel:access_token', expiresIn - 300, data.access_token);
  return data.access_token;
};

const airtelCollect = async (phoneNumber, amount, bookingId) => {
  return retryWithBackoff(async () => {
    const token = await getAirtelToken();

    const res = await fetch(
      `${AIRTEL_BASE_URL}/merchant/v1/payments/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Country': 'UG',
          'X-Currency': 'UGX',
        },
        body: JSON.stringify({
          reference: bookingId,
          subscriber: {
            country: 'UG',
            currency: 'UGX',
            msisdn: phoneNumber,
          },
          transaction: {
            amount: amount,
            country: 'UG',
            currency: 'UGX',
            id: bookingId,
          },
        }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Airtel collection failed: ${res.status} - ${error}`);
    }

    return await res.json();
  });
};

const airtelCheckStatus = async (transactionId) => {
  const token = await getAirtelToken();

  const res = await fetch(
    `${AIRTEL_BASE_URL}/merchant/v1/payments/${transactionId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Country': 'UG',
        'X-Currency': 'UGX',
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Airtel status check failed: ${res.status} - ${error}`);
  }

  const data = await res.json();
  return data.data?.status || data.status;
};

const airtelDisburse = async (riderPhone, amount, bookingId) => {
  return retryWithBackoff(async () => {
    const token = await getAirtelToken();

    const res = await fetch(
      `${AIRTEL_BASE_URL}/standard/v1/disbursements/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Country': 'UG',
          'X-Currency': 'UGX',
        },
        body: JSON.stringify({
          payee: {
            msisdn: riderPhone,
          },
          reference: `boda-${bookingId}`,
          pin: process.env.AIRTEL_PIN,
          transaction: {
            amount: amount,
            id: bookingId,
            type: 'B2C',
          },
        }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Airtel disbursement failed: ${res.status} - ${error}`);
    }

    return await res.json();
  });
};

const collectPayment = async (phoneNumber, amount, bookingId) => {
  const network = detectNetwork(phoneNumber);
  if (network === 'MTN') return mtnCollect(phoneNumber, amount, bookingId);
  if (network === 'AIRTEL') return airtelCollect(phoneNumber, amount, bookingId);
  throw new Error(`Unsupported network for phone: ${phoneNumber}`);
};

const checkPaymentStatus = async (transactionRef, network) => {
  if (network === 'MTN') return mtnCheckStatus(transactionRef);
  if (network === 'AIRTEL') return airtelCheckStatus(transactionRef);
  throw new Error(`Unknown network: ${network}`);
};

const disburseToRider = async (riderPhone, amount, bookingId) => {
  const network = detectNetwork(riderPhone);
  if (network === 'MTN') return mtnDisburse(riderPhone, amount, bookingId);
  if (network === 'AIRTEL') return airtelDisburse(riderPhone, amount, bookingId);
  throw new Error(`Unsupported network for phone: ${riderPhone}`);
};

const pollPaymentStatus = async (transactionRef, network, bookingId, maxAttempts = 24) => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));

    try {
      const status = await checkPaymentStatus(transactionRef, network);

      if (status === 'SUCCESSFUL' || status === 'successful') {
        await pool.query(
          `UPDATE payments SET status = 'held', held_at = NOW(), transaction_ref = $1
           WHERE booking_id = $2 AND status = 'pending'`,
          [transactionRef, bookingId]
        );
        return 'SUCCESSFUL';
      }

      if (status === 'FAILED' || status === 'failed') {
        await pool.query(
          `UPDATE payments SET status = 'failed' WHERE booking_id = $1 AND status = 'pending'`,
          [bookingId]
        );
        return 'FAILED';
      }
    } catch (err) {
      console.error(`Poll attempt ${i + 1} failed:`, err.message);
    }
  }

  await pool.query(
    `UPDATE payments SET status = 'flagged' WHERE booking_id = $1 AND status = 'pending'`,
    [bookingId]
  );
  return 'TIMEOUT';
};

module.exports = {
  detectNetwork,
  collectPayment,
  checkPaymentStatus,
  disburseToRider,
  pollPaymentStatus,
  mtnCheckStatus,
  airtelCheckStatus,
};
