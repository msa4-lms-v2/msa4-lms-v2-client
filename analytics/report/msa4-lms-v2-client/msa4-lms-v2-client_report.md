# msa4-lms-v2-client 작업 리포트

## 2026-08-14 방어 가드, 접근성, 결제 경로 정렬

### 요청

- 2026-08-14 재검수(`docs-v2` 감사)에서 발견한 Client 결함을 구현했다.

### 변경 내용

- `src/util/jwt.js` 토큰 파싱에 포맷 가드, `DashboardCalendar.vue` 날짜 변환에 Invalid Date 가드, `src/util/format.js` 화폐 포맷팅에 NaN 가드를 추가했다.
- `LoginIndex.vue`의 아이디 입력 `label for` 속성을 실제 input id와 일치시켰다.
- 대시보드 영역별 조회 실패에 loading/error/empty 상태와 재시도 동작을 추가하고, 앱 초기화 시 Refresh Token 쿠키로 1회 조용한 재발급을 시도한 뒤 라우팅을 결정하도록 했다.
- Payment API 경로(등록금 목록, 결제 확인 등)를 백엔드가 정렬한 최종 경로로 맞췄다.

### 브랜치

- `feature/defensive-guards-jwt-date-currency`
- `feature/login-form-label-accessibility`
- `feature/partial-failure-ui-states`
- `feature/payment-api-client-alignment`

### 미완료

- 5.3(대시보드 공지·일정 연동), 5.6(프론트 부분 실패 처리 전반)의 나머지 세부사항은 이번 라운드에서 다루지 않았다. `docs-v2/수정요약.md` 참고.

### 검증

- 각 브랜치는 독립적으로 커밋됐고 병합하지 않았다.
- push는 하지 않았다.
