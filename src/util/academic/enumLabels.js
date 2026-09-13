export const ACADEMIC_STATUS_LABEL = {
  ENROLLED: '재학',
  GRADUATED: '졸업',
  ON_LEAVE: '휴학',
  WITHDRAWN: '자퇴',
  DISMISSED: '제적',
};

export const ACADEMIC_STATUS_VARIANT = {
  ENROLLED: 'processing',
  GRADUATED: 'success',
  ON_LEAVE: 'warning',
  WITHDRAWN: 'fail',
  DISMISSED: 'fail',
};

export const INFO_CHANGE_STATUS_LABEL = {
  REQUESTED: '처리중',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELLED: '취소',
};

export const INFO_CHANGE_STATUS_VARIANT = {
  REQUESTED: 'processing',
  APPROVED: 'success',
  REJECTED: 'fail',
  CANCELLED: 'warning',
};

export const LEAVE_REQUEST_STATUS_LABEL = {
  PENDING: '교수 승인 대기',
  ADVISOR_APPROVED: '교수 승인 완료',
  APPROVED: '최종 승인',
  REJECTED: '반려',
  CANCELLED: '취소',
};

export const LEAVE_REQUEST_STATUS_VARIANT = {
  PENDING: 'processing',
  ADVISOR_APPROVED: 'warning',
  APPROVED: 'success',
  REJECTED: 'fail',
  CANCELLED: 'warning',
};
