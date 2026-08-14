// 메뉴 경로별 공통 타이틀 관리
export const MENU_TITLES = {
    '/main': { default: '메인 화면' },
    '/profile': { STUDENT: '학적 조회', PROFESSOR: '교적 조회', default: '내 정보' },
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
    '/professor/leave-return': { default: '휴/복학 결재' },
    '/professor/attendance/approvals': { default: '출결 승인' },
    '/professor/attendance': { default: '출결 확인' },
    '/scholarships/apply': { default: '장학금 신청' },
    '/scholarships/history': { default: '장학금 수혜 내역' },
    '/tuition/:tuitionBillId/installment': { default: '분할납부 신청' },
    '/payments/toss/success': { default: '결제 완료' },
    '/payments/toss/fail': { default: '결제 취소' },
};

// 권한에 따른 메뉴 타이틀 반환 유틸리티
export const getMenuTitle = (path, role) => {
    const menu = MENU_TITLES[path];
    if (!menu) return '알 수 없음';
    return menu[role] || menu.default;
};
