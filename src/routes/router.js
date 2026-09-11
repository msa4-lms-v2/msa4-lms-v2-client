import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../store/auth/useAuthStore';
import { useProfileStore } from '../store/profile/useProfileStore';
import { notify } from '../composables/useDialog';
const setMeta = (isAuthenticated, isGuestOnly, roles = []) => {
    return {
        isAuthenticated, // 인증된 사용자
        isGuestOnly, // 게스트
        roles, // 접근을 허용할 권한 목록
    };
};
const routes = [
    { path: '/admin/admissions', name: 'AdminAdmissionIndex', component: () => import('../pages/people/PeopleIndex.vue'), props: { kind: 'admission' }, meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/admissions/new', name: 'AdminAdmissionCreate', component: () => import('../pages/people/PeopleForm.vue'), props: { kind: 'admission' }, meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/admissions/:id', name: 'AdminAdmissionDetail', component: () => import('../pages/people/PeopleForm.vue'), props: { kind: 'admission' }, meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/professors', name: 'AdminProfessorIndex', component: () => import('../pages/people/PeopleIndex.vue'), props: { kind: 'professor' }, meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/professors/new', name: 'AdminProfessorCreate', component: () => import('../pages/people/PeopleForm.vue'), props: { kind: 'professor' }, meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/professors/:id', name: 'AdminProfessorDetail', component: () => import('../pages/people/PeopleForm.vue'), props: { kind: 'professor' }, meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/graduation-requirements', name: 'AdminGraduationRequirementIndex', component: () => import('../pages/grade/AdminGraduationRequirementIndex.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/grades/retake-reflection', name: 'AdminRetakeGradeReflection', component: () => import('../pages/grade/AdminRetakeGradeReflection.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/dismissals', name: 'AdminDismissalIndex', component: () => import('../pages/dismissal/AdminDismissalIndex.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/academic-schedules', name: 'AcademicScheduleIndex', component: () => import('../pages/academicSchedule/AcademicScheduleIndex.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/academic-schedules/new', name: 'AcademicScheduleCreate', component: () => import('../pages/academicSchedule/AcademicScheduleForm.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/academic-schedules/:scheduleId', name: 'AcademicScheduleDetail', component: () => import('../pages/academicSchedule/AcademicScheduleForm.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/notices', name: 'AdminNoticeIndex', component: () => import('../pages/notice/AdminNoticeIndex.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/notices/new', name: 'AdminNoticeCreate', component: () => import('../pages/notice/AdminNoticeForm.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/notices/:noticeId', name: 'AdminNoticeEdit', component: () => import('../pages/notice/AdminNoticeForm.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/admin/lecture-opening-requests', name: 'AdminLectureOpeningApproval', component: () => import('../pages/lecture/AdminLectureOpeningApproval.vue'), meta: { requiresAuth: true, roles: ['ADMIN'] } },
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'LoginIndex', component: () => import('../pages/auth/LoginIndex.vue') },
    {
        path: '/initial-password',
        name: 'InitialPasswordChange',
        component: () => import('../pages/auth/InitialPasswordChange.vue'),
        meta: { passwordChangeOnly: true },
    },
    {
        path: '/main',
        name: 'Dashboard',
        component: () => import('../pages/dashboard/Dashboard.vue'),
        meta: { ...setMeta(true, false), requiresAuth: true },
    },
    {
        path: '/profile',
        name: 'ProfilePage',
        component: () => import('../pages/profile/ProfilePage.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT', 'PROFESSOR'] },
    },
    {
        path: '/profile/info-change',
        name: 'InfoChangeRequest',
        component: () => import('../pages/profile/InfoChangeRequest.vue'),
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED', 'ON_LEAVE'],
        },
    },
    {
        path: '/professor/profile/info-change',
        name: 'ProfessorInfoChangeRequest',
        component: () => import('../pages/profile/ProfessorInfoChangeRequest.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/withdrawal',
        name: 'StudentWithdrawal',
        component: () => import('../pages/withdrawal/StudentWithdrawalPage.vue'),
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED', 'ON_LEAVE'],
        },
    },
    {
        path: '/leave-return/general',
        name: 'StudentGeneralLeave',
        component: () => import('../pages/leaveReturn/StudentLeaveReturnPage.vue'),
        props: { mode: 'leave' },
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED', 'ON_LEAVE'],
        },
    },
    {
        path: '/leave-return/return',
        name: 'StudentReturn',
        component: () => import('../pages/leaveReturn/StudentLeaveReturnPage.vue'),
        props: { mode: 'return' },
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED', 'ON_LEAVE'],
        },
    },
    {
        path: '/leave-return/military',
        name: 'StudentMilitaryLeave',
        component: () => import('../pages/leaveReturn/StudentMilitaryLeavePage.vue'),
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED'],
        },
    },
    {
        path: '/double-major',
        name: 'StudentDoubleMajor',
        component: () => import('../pages/doubleMajor/StudentDoubleMajorPage.vue'),
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED'],
        },
    },
    {
        path: '/department-transfer',
        name: 'StudentDepartmentTransfer',
        component: () => import('../pages/departmentTransfer/StudentDepartmentTransferPage.vue'),
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED'],
        },
    },
    {
        path: '/counseling',
        name: 'StudentCounselingApply',
        component: () => import('../pages/counseling/StudentCounselingApply.vue'),
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED', 'ON_LEAVE'],
        },
    },
    {
        path: '/counseling/history',
        name: 'StudentCounselingHistory',
        component: () => import('../pages/counseling/StudentCounselingHistory.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/counseling/:counselingId',
        name: 'StudentCounselingResult',
        component: () => import('../pages/counseling/StudentCounselingResult.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/tuition',
        name: 'TuitionIndex',
        component: () => import('../pages/payment/TuitionIndex.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/tuition/history',
        name: 'TuitionHistoryIndex',
        component: () => import('../pages/payment/TuitionHistoryIndex.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/tuition/:id',
        name: 'TuitionShow',
        component: () => import('../pages/payment/TuitionShow.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/admin/tuition',
        name: 'AdminTuitionIndex',
        component: () => import('../pages/payment/AdminTuitionIndex.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
        path: '/admin/tuition/:id',
        name: 'AdminTuitionShow',
        component: () => import('../pages/payment/AdminTuitionShow.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
        path: '/admin/info-change-requests',
        name: 'AdminInfoChangeRequestIndex',
        component: () => import('../pages/profile/AdminInfoChangeRequestIndex.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
        path: '/admin/academic-change-requests/department-transfer',
        name: 'AdminDepartmentTransferManagement',
        component: () => import('../pages/departmentTransfer/AdminDepartmentTransferManagement.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
        path: '/admin/academic-change-requests/double-major',
        name: 'AdminDoubleMajorManagement',
        component: () => import('../pages/doubleMajor/AdminDoubleMajorManagement.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
        path: '/payment/health',
        name: 'PaymentHealthIndex',
        component: () => import('../pages/payment/PaymentHealthIndex.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT', 'ADMIN'] },
    },
    {
        path: '/certificates/verify',
        name: 'CertificateVerify',
        component: () => import('../pages/payment/CertificateVerify.vue'),
    },
    {
        path: '/admin/certificates/revoke',
        name: 'AdminCertificateRevoke',
        component: () => import('../pages/payment/AdminCertificateRevoke.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
    {
        path: '/professor/attendance/qr',
        name: 'ProfessorQrAttendance',
        component: () => import('../pages/attendance/ProfessorQrAttendance.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/professor/counseling',
        name: 'ProfessorCounselingList',
        component: () => import('../pages/counseling/ProfessorCounselingList.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'], tabKey: 'professor-counseling' },
    },
    {
        path: '/professor/counseling/:counselingId',
        name: 'ProfessorCounselingAnswer',
        component: () => import('../pages/counseling/ProfessorCounselingAnswer.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'], tabKey: 'professor-counseling' },
    },
    {
        path: '/attendance/check-in',
        name: 'AttendanceCheckIn',
        component: () => import('../pages/attendance/AttendanceCheckIn.vue'),
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED'],
        },
    },
    {
        path: '/scholarships/apply',
        name: 'ScholarshipApplicationApply',
        component: () => import('../pages/payment/ScholarshipApplicationApply.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/scholarships/history',
        name: 'ScholarshipHistory',
        component: () => import('../pages/payment/ScholarshipHistory.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/tuition/:tuitionBillId/installment',
        name: 'InstallmentApply',
        component: () => import('../pages/payment/InstallmentApply.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/payments/toss/success',
        name: 'TossPaymentSuccess',
        component: () => import('../pages/payment/TossPaymentSuccess.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/payments/toss/fail',
        name: 'TossPaymentFail',
        component: () => import('../pages/payment/TossPaymentFail.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/enrollments',
        name: 'StudentTimetableIndex',
        component: () => import('../pages/enrollment/StudentTimetableIndex.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/registration',
        name: 'StudentRegistrationIndex',
        component: () => import('../pages/enrollment/StudentRegistrationIndex.vue'),
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED'],
        },
    },
    {
        path: '/grade',
        name: 'StudentGradeIndex',
        component: () => import('../pages/grade/StudentGradeIndex.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/graduation-diagnosis',
        name: 'StudentGraduationDiagnosis',
        component: () => import('../pages/grade/StudentGraduationDiagnosis.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'], academicStatuses: ['ENROLLED', 'ON_LEAVE', 'GRADUATED'] },
    },
    {
        path: '/evaluations',
        name: 'StudentLectureEvaluation',
        component: () => import('../pages/grade/StudentLectureEvaluation.vue'),
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED'],
        },
    },
    {
        path: '/attendance',
        name: 'StudentAttendanceIndex',
        component: () => import('../pages/attendance/StudentAttendanceIndex.vue'),
        meta: { requiresAuth: true, roles: ['STUDENT'] },
    },
    {
        path: '/excuses',
        name: 'StudentExcuseIndex',
        component: () => import('../pages/attendance/StudentExcuseIndex.vue'),
        meta: {
            requiresAuth: true,
            roles: ['STUDENT'],
            academicStatuses: ['ENROLLED'],
        },
    },
    {
        path: '/professor/leave-return',
        name: 'ProfessorLeaveReturnApproval',
        component: () => import('../pages/leaveReturn/ProfessorLeaveReturnApproval.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/professor/academic-change-requests/department-transfer',
        name: 'ProfessorDepartmentTransferReview',
        component: () => import('../pages/departmentTransfer/ProfessorDepartmentTransferReview.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/professor/academic-change-requests/double-major',
        name: 'ProfessorDoubleMajorReview',
        component: () => import('../pages/doubleMajor/ProfessorDoubleMajorReview.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/professor/lectures/create',
        name: 'ProfessorLectureOpeningCreate',
        component: () => import('../pages/lecture/ProfessorLectureOpeningCreate.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/lectures',
        name: 'ProfessorLectureIndex',
        component: () => import('../pages/lecture/ProfessorLectureIndex.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/professor/grades/input',
        name: 'ProfessorGradeInput',
        component: () => import('../pages/grade/ProfessorGradeInput.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/professor/evaluations',
        name: 'ProfessorLectureEvaluation',
        component: () => import('../pages/grade/ProfessorLectureEvaluation.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/professor/grades/correct',
        name: 'ProfessorGradeCorrection',
        component: () => import('../pages/grade/ProfessorGradeCorrection.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/professor/attendance/approvals',
        name: 'ProfessorAttendanceApprovals',
        component: () => import('../pages/attendance/ProfessorAttendanceApprovals.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/professor/attendance',
        name: 'ProfessorAttendanceIndex',
        component: () => import('../pages/attendance/ProfessorAttendanceIndex.vue'),
        meta: { requiresAuth: true, roles: ['PROFESSOR'] },
    },
    {
        path: '/students',
        name: 'AdminStudentIndex',
        component: () => import('../pages/student/AdminStudentIndex.vue'),
        meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

let isInitChecked = false;

router.beforeEach(async (to) => {
    const authStore = useAuthStore();
    
    if (!isInitChecked) {
        try {
            await authStore.reissue();
        } catch (e) {
            // 조용한 재발급 실패 무시
        }
        isInitChecked = true;
    }

    if (authStore.requiresInitialPasswordChange && !to.meta.passwordChangeOnly) {
        return '/initial-password';
    }

    if (to.meta.passwordChangeOnly && !authStore.requiresInitialPasswordChange) {
        return authStore.isLoggedIn ? '/main' : '/login';
    }

    if (to.meta.requiresAuth && !authStore.isLoggedIn) {
        return {
            path: '/login',
            query: { redirect: to.fullPath },
        };
    }
    if (to.meta.roles?.length && !to.meta.roles.includes(authStore.userInfo?.role)) {
        await notify('접근 권한이 없습니다.');
        return '/main';
    }

    if (authStore.userInfo?.role === 'STUDENT' && to.meta.academicStatuses?.length) {
        const profileStore = useProfileStore();

        try {
            await profileStore.fetchStudentProfile();
        } catch {
            await notify('학적 상태를 확인할 수 없습니다.');
            return '/main';
        }

        if (!to.meta.academicStatuses.includes(profileStore.profile?.academicStatus)) {
            await notify('현재 학적 상태에서는 해당 기능을 이용할 수 없습니다.');
            return '/main';
        }
    }
});

router.afterEach((to) => {
    if (['/login', '/initial-password', '/attendance/check-in'].includes(to.path)) {
        return;
    }
    // 컴포넌트 외부에서 호출되므로 콜백 내부에서 동적으로 스토어를 임포트하여 사용
    import('../store/tab/useTabStore.js').then(({ useTabStore }) => {
        const tabStore = useTabStore();
        tabStore.addTab(to);
    });
});

router.onError((error) => {
    if (/Loading chunk/.test(error.message)) {
        window.location.reload();
    }
});

export default router;
