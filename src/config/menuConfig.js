// 메뉴 경로별 공통 타이틀 관리
export const MENU_TITLES = {
    '/admin/admissions': { default: '입학 예정자 목록' },
    '/admin/admissions/new': { default: '입학 예정자 등록' },
    '/admin/professors': { default: '교수 목록' },
    '/admin/professors/new': { default: '교수 등록' },
    '/main': { default: '메인 화면' },
    '/profile': { STUDENT: '학적 조회', PROFESSOR: '교적 조회', default: '내 정보' },
    '/profile/info-change': { default: '정보 변경 신청' },
    '/admin/info-change-requests': { default: '학적 정보 변경 승인' },
    '/admin/academic-change-requests/department-transfer': { default: '전과 신청 관리' },
    '/admin/academic-change-requests/double-major': { default: '복수전공 신청 관리' },
    '/tuition': { default: '등록금 납부' },
    '/tuition/history': { default: '등록금 납부 내역' },
    '/admin/tuition': { default: '등록금 관리' },
    '/admin/certificates/revoke': { default: '증명서 폐기' },
    '/payment/health': { default: '결제 상태' },
    '/enrollments': { default: '시간표 조회' },
    '/registration': { default: '수강 신청' },
    '/grade': { default: '성적 조회' },
    '/attendance': { default: '출결 조회' },
    '/excuses': { default: '공결 신청' },
    '/professor/lectures/create': { default: '강의 개설' },
    '/lectures': { default: '강의 조회' },
    '/professor/grades/input': { default: '성적 입력' },
    '/professor/grades/correct': { default: '성적 정정' },
    '/leave-return/general': { default: '일반휴학/복학 신청' },
    '/leave-return/military': { default: '군휴학 신청' },
    '/department-transfer': { default: '전과 신청' },
    '/double-major': { default: '복수전공 신청' },
    '/counseling': { default: '온라인 상담' },
    '/counseling/history': { default: '상담 내역' },
    '/professor/counseling': { default: '온라인 상담' },
    '/professor/leave-return': { default: '휴/복학 결재' },
    '/professor/academic-change-requests/department-transfer': { default: '전과 신청 검토' },
    '/professor/academic-change-requests/double-major': { default: '복수전공 신청 검토' },
    '/professor/attendance/approvals': { default: '출결 승인' },
    '/professor/attendance': { default: '출결 확인' },
    '/professor/attendance/qr': { default: 'QR 출석 관리' },
    '/scholarships/apply': { default: '장학금 신청' },
    '/scholarships/history': { default: '장학금 수혜 내역' },
    '/tuition/:tuitionBillId/installment': { default: '분할납부 신청' },
    '/payments/toss/success': { default: '결제 완료' },
    '/payments/toss/fail': { default: '결제 취소' },
    '/students': { default: '학생 관리' },
};

// 동적 파라미터가 있어 MENU_TITLES의 경로 일치로 찾을 수 없는 라우트는 route name으로 별도 매핑한다.
export const MENU_TITLES_BY_NAME = {
    AdminAdmissionDetail: '입학 예정자 상세',
    AdminProfessorDetail: '교수 상세',
    TuitionShow: '등록금 상세',
    AdminTuitionShow: '등록금 상세',
    InstallmentApply: '분할납부 신청',
    StudentCounselingResult: '상담 결과',
    ProfessorCounselingAnswer: '온라인 상담 답변',
};

// 권한에 따른 메뉴 타이틀 반환 유틸리티
export const getMenuTitle = (path, role) => {
    const menu = MENU_TITLES[path];
    if (!menu) return '알 수 없음';
    return menu[role] || menu.default;
};
