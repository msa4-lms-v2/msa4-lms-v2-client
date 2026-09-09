export const WITHDRAWAL_ATTACHMENT_ACCEPT = [
  '.pdf', '.hwp', '.hwpx', '.jpg', '.jpeg', '.png', '.gif', '.webp',
].join(',');

export const WITHDRAWAL_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'hwp', 'hwpx', 'jpg', 'jpeg', 'png', 'gif', 'webp',
]);

export const validateWithdrawalAttachment = (file) => {
  if (!file) return '';
  if (file.size > WITHDRAWAL_ATTACHMENT_MAX_SIZE) {
    return '증빙 파일은 10MB 이하여야 합니다.';
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return 'PDF, HWP/HWPX, JPEG, PNG, GIF, WebP 파일만 첨부할 수 있습니다.';
  }
  return '';
};
