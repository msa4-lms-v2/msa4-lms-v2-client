import { defineStore } from 'pinia';
import { ref } from 'vue';
import myAxios from '../../api/myAxios';

export const useDocumentStore = defineStore('documentStore', () => {
  // 1. State (ref)
  const issuedDocument = ref(null);
  const verificationResult = ref(null);
  const isIssuing = ref(false);
  const isVerifying = ref(false);
  const isRevoking = ref(false);

  // 2. Getters (computed)

  // 3. Actions (function)
  const issuePaymentReceipt = async (tuitionBillId) => {
    isIssuing.value = true;
    try {
      const res = await myAxios.post('/api/payment/payment-receipts', { tuitionBillId });
      issuedDocument.value = res.data.data;
      return issuedDocument.value;
    } finally {
      isIssuing.value = false;
    }
  };

  const verifyCertificate = async ({ token, qrHash }) => {
    isVerifying.value = true;
    verificationResult.value = null;
    try {
      const res = await myAxios.get('/api/payment/certificates/verify', {
        params: { token, qrHash: qrHash || undefined },
      });
      verificationResult.value = res.data.data;
      return verificationResult.value;
    } finally {
      isVerifying.value = false;
    }
  };

  const revokeDocument = async ({ documentId, reason }) => {
    isRevoking.value = true;
    try {
      const res = await myAxios.patch(`/api/payment/certificates/${documentId}/revoke`, { reason });
      return res.data.data;
    } finally {
      isRevoking.value = false;
    }
  };

  return {
    issuedDocument,
    verificationResult,
    isIssuing,
    isVerifying,
    isRevoking,
    issuePaymentReceipt,
    verifyCertificate,
    revokeDocument,
  };
});
