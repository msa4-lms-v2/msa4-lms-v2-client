export const TUITION_BILL_STATUS_LABEL = {
  UNPAID: '미납',
  PARTIAL: '부분납부',
  PAID: '완납',
  OVERDUE: '연체',
};

export const TUITION_BILL_STATUS_VARIANT = {
  UNPAID: 'warning',
  PARTIAL: 'processing',
  PAID: 'success',
  OVERDUE: 'fail',
};

export const SCHOLARSHIP_TYPE_LABEL = {
  MERIT: '성적 우수',
  NEED_BASED: '소득 분위',
  OTHER: '기타',
};

export const HEALTH_STATUS_VARIANT = {
  UP: 'success',
  DOWN: 'fail',
};

export const PAYMENT_STATUS_LABEL = {
  REQUESTED: '처리중',
  SUCCEEDED: '결제 완료',
  FAILED: '결제 실패',
  CANCELLED: '취소됨',
};

export const PAYMENT_STATUS_VARIANT = {
  REQUESTED: 'processing',
  SUCCEEDED: 'success',
  FAILED: 'fail',
  CANCELLED: 'warning',
};

export const PAYMENT_TYPE_LABEL = {
  LUMP_SUM: '일괄납부',
  INSTALLMENT: '분할납부',
};

export const REFUND_STATUS_LABEL = {
  REQUESTED: '처리중',
  SUCCEEDED: '완료',
  FAILED: '실패',
  RETRYING: '재시도중',
};

export const REFUND_STATUS_VARIANT = {
  REQUESTED: 'processing',
  SUCCEEDED: 'success',
  FAILED: 'fail',
  RETRYING: 'warning',
};

export const SCHOLARSHIP_APPLICATION_STATUS_LABEL = {
  REQUESTED: '처리중',
  APPROVED: '승인',
  REJECTED: '반려',
};

export const SCHOLARSHIP_APPLICATION_STATUS_VARIANT = {
  REQUESTED: 'processing',
  APPROVED: 'success',
  REJECTED: 'fail',
};

export const INSTALLMENT_PLAN_STATUS_LABEL = {
  REQUESTED: '승인대기',
  ACTIVE: '진행중',
  REJECTED: '반려',
  COMPLETED: '완료',
};

export const INSTALLMENT_PLAN_STATUS_VARIANT = {
  REQUESTED: 'processing',
  ACTIVE: 'success',
  REJECTED: 'fail',
  COMPLETED: 'success',
};

export const INSTALLMENT_ITEM_STATUS_LABEL = {
  SCHEDULED: '납부예정',
  PAID: '납부완료',
};

export const INSTALLMENT_ITEM_STATUS_VARIANT = {
  SCHEDULED: 'warning',
  PAID: 'success',
};
