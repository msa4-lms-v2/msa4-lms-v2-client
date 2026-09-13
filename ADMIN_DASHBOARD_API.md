# 관리자 대시보드 API

academic과 payment의 실제 DB 집계 API 및 프런트 연결을 구현했다. 두 대시보드 API는 ADMIN 전용이다.
DB나 서비스 조회 실패는 오류로 표시하며, 실패를 0건 또는 현재 학기 미설정으로 바꾸지 않는다.

## 엔드포인트

- `GET /api/academic/admin/dashboard`: 누적 학사 대기 업무, 현재 학기 학적 통계.
- `GET /api/payment/admin/dashboard`: 누적 분할납부 대기 업무, 현재 학기 등록금 통계.
- 응답 래퍼: `{ "code": "00", "message": "...", "data": { ... } }`.
- `GET /api/academic/catalog/semesters/current/snapshot`: payment용 내부 현재 학기 조회. 기존 학기 snapshot 접근 경계를 사용한다.
- payment는 `GATEWAY_INTERNAL_BASE_URL`을 통해 academic 현재 학기 설정을 조회한다. 배포 ConfigMap은 academic 서비스의 내부 주소를 사용한다. 로컬에서도 이 값을 academic 내부 주소로 설정해야 한다.
- 현재 학기가 없으면 `currentSemester`와 학기 통계는 null이며 누적 대기 업무는 반환한다. 학기 조회 자체가 실패하면 오류 응답이다.
- 학기는 날짜나 최신 고지서로 추정하지 않는다.

## academic 응답 data

```json
{
  "currentSemester": { "id": 20, "year": 2026, "label": "2학기" },
  "summary": { "lecturePending": 0, "academicChangePending": 0 },
  "tasks": [],
  "academicStats": [
    { "type": "LEAVE", "completed": 0, "pending": 0 },
    { "type": "RETURN", "completed": 0, "pending": 0 },
    { "type": "WITHDRAWAL", "completed": 0, "pending": 0 },
    { "type": "DISMISSAL", "completed": 0, "pending": 0 },
    { "type": "TRANSFER", "completed": 0, "pending": 0 },
    { "type": "DOUBLE_MAJOR", "completed": 0, "pending": 0 }
  ]
}
```

### 누적 처리 대기

- 강의 개설: `lecture_opening_requests.PENDING`.
- 휴·복학: `academic_requests.PENDING`, 일반/군 휴학·복학을 각각 합산.
- 자퇴: `withdrawal_requests.ADVISOR_APPROVED` (교수 검토가 끝난 관리자 대기).
- 퇴학: `dismissal_candidates.PENDING`.
- 전과·복수전공: `academic_change_requests.ADVISOR_APPROVED`.
- 학적 변경 카드에는 위 휴·복학/자퇴/퇴학/전과/복수전공 대기 건을 합산한다.
- 요약과 목록의 모집단은 동일하며 학기 제한이 없다. 요약은 전체 COUNT, 목록은 서비스별 오래된 30건이다.

### 학적 차트의 현재 학기 판정

- 휴·복학: `target_year`와 `target_semester`.
- 전과: `target_semester_id`; 없으면 신청 기간의 학기.
- 복수전공: 신청 기간(`request_period_id`)의 학기. 대상 학기 값이 있으면 우선한다.
- **기존 자퇴·퇴학 데이터에는 대상 학기 컬럼이 없다.** 자퇴는 효력일 → 요청 효력일 → 접수일 순으로 현재 학기 시작·종료일 범위에 포함되는지 판단한다. 퇴학은 처리일 → 등록일 순으로 판단한다. 방학 접수에 명시적 효력일이 없는 경우 대상 학기를 추측하지 않으며 차트에서 제외될 수 있다. 누적 대기 카드·목록에는 포함된다.
- 완료: `APPROVED`, `APPLIED`, `REJECTED`, `ADVISOR_REJECTED`, `CONFIRMED`.
- 미처리: `PENDING`, `ADVISOR_APPROVED`. 차트는 교수 검토 대기도 포함한다.
- `CANCELLED`는 제외. 퇴학에는 반려 상태가 없어 확정만 완료로 집계한다.

## payment 응답 data

```json
{
  "currentSemester": { "id": 20, "year": 2026, "label": "2학기" },
  "summary": { "installmentPending": 0, "scholarshipPending": 0 },
  "tasks": [],
  "tuitionStats": { "paid": 0, "inProgress": 0, "unpaid": 0 }
}
```

- 분할납부 대기: 현재 학기의 `installment_plans.REQUESTED`.
- 장학금 신청 대기: 현재 학기의 `scholarship_applications.REQUESTED`.
- 현재 학기의 고지서별 납부 대상액: `max(고지액 - 장학금 합계, 0)`.
- 순납부액: `max(SUCCEEDED 결제 합계 - SUCCEEDED 환불 합계, 0)`.
- 납부 완료: 순납부액 >= 납부 대상액. 0원 고지서·전액 장학금 포함.
- 납부 진행: 순납부액 > 0 이고 납부 대상액보다 적음.
- 미납: 순납부액 = 0 이고 납부 대상액 > 0.
- 성공하지 않은 결제·환불은 제외하며 분할납부 승인 여부나 고지서의 저장 상태값으로 분류하지 않는다.
- 현재 고지서 모델에는 취소/무효 상태가 없다. 기존 고지서는 모두 위 금액 기준으로 분류한다.
- 결제·환불·장학금을 각각 먼저 GROUP BY한 뒤 조인하여 다대일 조인 중복 집계를 방지한다.
- 차트 단위는 고지서 건수. 완료율은 `paid / 전체 건수 * 100`을 반올림한다.

## 업무 목록 및 바로가기

```json
{
  "id": 1,
  "type": "INSTALLMENT 또는 SCHOLARSHIP",
  "requesterName": "요청자 이름",
  "requestedAt": "2026-09-01T09:00:00",
  "tuitionBillId": 42
}
```

- 학사 업무 type: LECTURE, LEAVE, RETURN, WITHDRAWAL, DISMISSAL, TRANSFER, DOUBLE_MAJOR.
- payment의 분할납부 업무만 `tuitionBillId`를 추가 반환한다.
- 두 서비스 목록을 합쳐 전체에서 오래된 30건을 골라 6건씩 표시한다. 접수일 동률이면 서비스·유형·ID 순으로 정렬한다.
- 분할납부는 `/admin/tuition/{tuitionBillId}`의 심사 화면으로 연결한다. 전과·복수전공·퇴학은 기존 관리 목록에 연결한다.
- 나머지 유형은 관리자 관리 화면이 아직 없어 준비 중으로 표시한다.
- 메인 최초 진입, 재진입, 새로고침에서 조회하며 로딩·오류·현재 학기 미설정·0건을 구분한다.

## 검증 명령

- 각 백엔드: `gradlew.bat test --tests '*dashboard.*Test'` (Java 21, Docker 필요).
- 프런트: `node --test --test-isolation=none tests/adminDashboard.test.mjs`.
- 변경 파일 ESLint 및 `npm run build`.
- MySQL 테스트는 별도 컨테이너에 최소 조회 스키마를 생성하며 운영 DB를 사용하지 않는다.
