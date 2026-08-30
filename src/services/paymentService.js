import apiClient from '../api/client';

/**
 * Mock demo agreements available for offline exploration or reference validation
 */
export const DEMO_AGREEMENTS = {
  'AGR-2026-X0MTKL6A': {
    referenceNumber: 'AGR-2026-X0MTKL6A',
    agreementId: '39711933-62f5-4226-b0c5-8fd880d0bf33',
    customerName: 'betselot Wodere',
    customerPhoneNumber: '0934444449',
    amount: 12000,
    currency: 'ETB',
    dueDate: '2026-09-01T00:00:00.000Z',
    description: 'Monthly residential lease - Bole Subcity Apartment #4B',
    landlordName: 'Abebe Kebede (Property Owner)',
    propertyLocation: 'Bole Atlas, Addis Ababa, Ethiopia',
  },
  'AGR-2026-KZ9210B4': {
    referenceNumber: 'AGR-2026-KZ9210B4',
    agreementId: '77218201-11d2-4309-a1b4-92e104a55c21',
    customerName: 'Helina Tadesse',
    customerPhoneNumber: '0911223344',
    amount: 8500,
    currency: 'ETB',
    dueDate: '2026-09-05T00:00:00.000Z',
    description: 'Residential lease - Kazanchis Studio 2A',
    landlordName: 'Mulugeta Haile (Landlord)',
    propertyLocation: 'Kazanchis, Kirkos Subcity, Addis Ababa',
  }
};

/**
 * Inquire rental agreement payment information by reference number.
 * Corresponds to: GET /api/payments/inquiry/:referenceNumber
 * 
 * @param {string} referenceNumber
 * @param {boolean} allowDemoFallback - fallback to demo fixture if backend is offline
 * @returns {Promise<{success: boolean, data: object, isDemoData?: boolean}>}
 */
export async function inquireRentalAgreement(referenceNumber, allowDemoFallback = true) {
  const cleanRef = referenceNumber.trim();
  
  try {
    const response = await apiClient.get(`/api/payments/inquiry/${encodeURIComponent(cleanRef)}`);
    return {
      success: true,
      data: response.data?.data || response.data,
      isDemoData: false
    };
  } catch (error) {
    // If backend is offline or returned 404, check if there's a demo fixture matching this reference
    if (allowDemoFallback && DEMO_AGREEMENTS[cleanRef.toUpperCase()]) {
      console.info(`[SmartRent] Backend unavailable or returned error. Using simulated fixture for demo ref: ${cleanRef}`);
      return {
        success: true,
        data: DEMO_AGREEMENTS[cleanRef.toUpperCase()],
        isDemoData: true
      };
    }
    
    // Otherwise throw the original processed error
    throw error;
  }
}

/**
 * Initiate rental payment through SmartRent provider abstraction.
 * Corresponds to: POST /api/payments
 * 
 * @param {object} payload
 * @param {string} payload.referenceNumber
 * @param {number} payload.amount
 * @param {'TELEBIRR'|'CBE'} payload.paymentMethod
 * @param {string} payload.customerName
 * @param {string} payload.customerPhoneNumber
 * @param {boolean} allowDemoFallback
 * @returns {Promise<{success: boolean, data: object, isDemoData?: boolean}>}
 */
export async function initiatePayment(payload, allowDemoFallback = true) {
  try {
    const response = await apiClient.post('/api/payments', {
      referenceNumber: payload.referenceNumber,
      amount: Number(payload.amount),
      paymentMethod: payload.paymentMethod,
      customerName: payload.customerName,
      customerPhoneNumber: payload.customerPhoneNumber,
    });

    return {
      success: true,
      data: response.data?.data || response.data,
      isDemoData: false
    };
  } catch (error) {
    // If offline/demo mode, return simulated pending payment transaction
    if (allowDemoFallback) {
      console.info('[SmartRent] Simulating provider payment initiation receipt (Backend offline or demo mode)');
      
      const mockTxRef = `TXN-${payload.paymentMethod}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      return {
        success: true,
        data: {
          transactionReference: mockTxRef,
          referenceNumber: payload.referenceNumber,
          amount: payload.amount,
          currency: 'ETB',
          paymentMethod: payload.paymentMethod,
          status: 'PENDING',
          customerName: payload.customerName,
          customerPhoneNumber: payload.customerPhoneNumber,
          initiatedAt: new Date().toISOString(),
          message: 'Payment initiated successfully. Status is PENDING verification from provider callback/webhook.'
        },
        isDemoData: true
      };
    }

    throw error;
  }
}
