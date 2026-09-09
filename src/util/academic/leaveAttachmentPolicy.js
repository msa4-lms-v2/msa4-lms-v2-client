export const LEAVE_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
export const LEAVE_ATTACHMENT_ACCEPT = '.pdf,.hwp,.hwpx,.jpg,.jpeg,.png,.gif,.webp';

const LEAVE_ATTACHMENT_EXTENSIONS = new Set([
  'pdf', 'hwp', 'hwpx', 'jpg', 'jpeg', 'png', 'gif', 'webp',
]);

const fileExtension = (file) => file?.name?.split('.').pop()?.toLowerCase() || '';

export const validateLeaveAttachment = (file, label = '증빙 파일') => {
  if (!file) return `${label}을 첨부해 주세요.`;
  if (!LEAVE_ATTACHMENT_EXTENSIONS.has(fileExtension(file))) {
    return `${label}은 PDF, HWP/HWPX, JPEG, PNG, GIF 또는 WebP 형식만 선택할 수 있습니다.`;
  }
  if (file.size > LEAVE_ATTACHMENT_MAX_SIZE) {
    return `${label}은 10MB 이하만 선택할 수 있습니다.`;
  }
  return '';
};
