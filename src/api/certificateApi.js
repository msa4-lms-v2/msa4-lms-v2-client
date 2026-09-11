import myAxios from './myAxios';

const CERTIFICATES_URL = '/api/payment/certificates';
const EMPLOYMENT_CERTIFICATES_URL = '/api/payment/employment-certificates';

// 학생 재학/성적/졸업증명서 발급 (documentType: 'ENROLLMENT' | 'GRADE' | 'GRADUATION')
export const issueCertificate = (documentType) =>
  myAxios.post(CERTIFICATES_URL, { documentType });

// 교수 재직증명서 발급
export const issueEmploymentCertificate = () =>
  myAxios.post(EMPLOYMENT_CERTIFICATES_URL);

// 발급된 증명서 PDF 다운로드 (서버가 MinIO 다운로드 URL로 302 리다이렉트한다)
export const downloadCertificate = (documentId) =>
  myAxios.get(`${CERTIFICATES_URL}/${documentId}/download`, { responseType: 'blob' });
