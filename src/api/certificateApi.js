import myAxios from './myAxios';

const CERTIFICATES_URL = '/api/payment/certificates';
const EMPLOYMENT_CERTIFICATES_URL = '/api/payment/employment-certificates';

// 학생 재학/성적/졸업증명서 발급 (documentType: 'ENROLLMENT' | 'GRADE' | 'GRADUATION')
export const issueCertificate = (documentType) =>
  myAxios.post(CERTIFICATES_URL, { documentType }, { skipRetry: true });

// 교수 재직증명서 발급
export const issueEmploymentCertificate = () =>
  myAxios.post(EMPLOYMENT_CERTIFICATES_URL, undefined, { skipRetry: true });

// 인증된 Payment 서버가 PDF를 직접 반환한다.
export const downloadCertificate = (documentId) =>
  myAxios.get(`${CERTIFICATES_URL}/${documentId}/content`, { responseType: 'blob' });

export const issueCareerCertificate = () => myAxios.post('/api/payment/career-certificates', undefined, { skipRetry: true });
export const issueLectureCareerCertificate = () => myAxios.post('/api/payment/lecture-career-certificates', undefined, { skipRetry: true });

export const getStudentCertificateHistory = (params) => myAxios.get('/api/payment/students/me/certificates', { params });

export const getProfessorCertificateHistory = (params) => myAxios.get('/api/payment/professors/me/certificates', { params });
