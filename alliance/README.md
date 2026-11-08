# BAM 연맹 기지 관리 — 완전히 독립된 웹앱

## 현재 상태
- 공개 조회용 단독 웹: `/alliance/index.html`; 기존 폐지줍기 웹 `/index.html` 수정 없음.
- 독립 기준 좌표: `/alliance/data.json` (검증된 V2 HQ 100개, 지휘센터 번호 1~100).
- 공개 조회: 지도 확대/이동, 번호 선택, 닉네임·좌표 검색, 전체/등록/빈자리 분류, 현재 지도의 SVG 저장.
- 관리: 연맹장이 PIN으로 로그인해 닉네임 및 지휘센터 대표 좌표(X,Y)를 편집. **현재는 Worker 주소가 비어 있어 조회 전용이며, 관리 기능은 백엔드를 배포한 뒤 동작함.**
- 회원 계정 불필요, GitHub 계정도 연맹장에게 불필요. 공개 조회는 비밀번호 불필요.
- 백엔드: `backend/worker.js` + 독립 Cloudflare D1 DB; 폐지줍기 `targets.json` 등과 데이터·로그를 절대 공유하지 않음.
- 닉네임은 3~4글자로 표시하는 것을 권장하며 24글자까지 저장 가능. 긴 닉네임은 지도에서 앞 9글자만 표시.
- 번호는 고정: 연맹장 좌표 변경 시 1~100 번호가 자동 재배열되지 않음.
- 공개 데이터 자체는 연맹원뿐 아니라 누구나 볼 수 있음.

## 기존 100개 지휘센터 기준
- `PuzzleOfZ_BAM_V2_100_coordinates_verified.txt` (2026-11-01에 산출된 완성본)에서 가져온 지휘센터 100개.
- 104개에서 원래의 74·89·93·97번을 제거하고 나머지를 음향함정에서 거리순 1~100으로 재번호.
- 연맹 시설(2×2 아래 대표좌표): 보루 (299,535), 음향함정 (297,533), 강철공장 (301,533), 창고 (313,537), 병원 (315,535).
- 전초(1×1): 1 (287,535), 2 (298,546), 3 (298,524), 4 (309,535).
- 산(2×2): (299,531), (286,538), (300,548); (318,538) 산은 위치 불확실하므로 점유·검증 대상에서 제외.
- 최초 100개와 시설/산/전초의 2×2 점유 겹침 없음. 지도는 정적 PNG 덧칠이 아니라 좌표에서 SVG를 재계산해 렌더링.
- 황무지 경계 및 게임 내 지형 장애물은 별도 수동 확인 필요.

## 관리자 모드 자동 설치 (권장)
현재 **웹의 관리자 로그인 화면과 서버 API 코드까지 작성돼 있지만, Cloudflare 계정 연결 전에는 실제 관리자 로그인이 불가능**하다. GitHub Pages는 정적 호스팅이므로 독립 서버가 필요하다.

1. Cloudflare 무료 계정에 로그인하고 **계정 ID(Account ID)**를 확인한다.
2. Cloudflare에서 API Token을 생성한다. 계정의 **Workers Scripts Edit** 및 **D1 Edit** 권한이 필요하다. 토큰 범위는 가능한 한 해당 계정으로 제한한다.
3. 공개 웹 저장소 [GitHub Actions secrets](https://github.com/JHBahk/puzzle-of-z-web/settings/secrets/actions)에 다음 **3개 비밀값**을 등록한다.
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 계정 ID
   - `CLOUDFLARE_API_TOKEN`: Cloudflare API Token
   - `BAM_ADMIN_PIN`: 연맹장 수정 PIN `7777`
4. [BAM 관리자 배포 작업](https://github.com/JHBahk/puzzle-of-z-web/actions/workflows/bam-alliance-admin.yml)에서 **Run workflow**, 입력란에 `DEPLOY`을 입력해 실행한다.
5. 배포 작업은 자동으로 `bam-alliance` D1 DB 생성/재사용, 테이블 설치, Worker 배포, 비밀 PIN 설정, 100개 좌표 데이터 검증, `alliance/config.json`에 공개 API 주소 연결을 수행한다. 완료 후 GitHub Pages 재배포 성공을 확인한다.
6. [연맹 웹](https://jhbahk.github.io/puzzle-of-z-web/alliance/)에서 **관리자 로그인** → PIN `7777` → 선택한 번호의 닉네임 또는 좌표 수정 → 저장. 지도 데이터는 D1에 영구 저장되고 다른 회원은 새로고침하여 확인할 수 있다.

**주의:** PIN은 GitHub Secret/Cloudflare Secret에만 입력하고 채팅·웹 HTML·JS·공개 저장소에는 넣지 않는다. 4자리 PIN은 추측될 수 있으므로 IP별 15분 잠금 정책을 적용했지만 고도의 보안은 제공하지 않는다. GitHub Actions 비밀값 등록은 사용자 GitHub 권한과 Cloudflare 계정에서 직접 진행해야 하며, 여기서는 이 계정의 외부 자격 증명을 대신 발급할 수 없다.

## 연맹장 편집용 서버 연결 (수동 대안)
Cloudflare 계정에 Worker와 D1 데이터베이스를 만들어야 함. 이 단계는 GitHub Pages만으로 자동 실행할 수 없음.

1. 별도 폴더 `alliance/backend/`를 로컬에 복사하고, Node.js / npm / Cloudflare Wrangler 환경 준비.
2. Cloudflare 로그인: `npx wrangler login`
3. D1 생성: `npx wrangler d1 create bam-alliance`
4. `wrangler.toml.example`를 `wrangler.toml`로 복사하고 생성된 `database_id`를 채움.
5. 테이블 적용: `npx wrangler d1 execute bam-alliance --remote --file=./schema.sql`
6. 비밀번호(비공개 서버 Secret): `npx wrangler secret put ADMIN_PIN` → 원하는 값 `7777`을 입력. PIN을 공개 HTML/JS에 적지 말 것.
7. 서명용 임의 비밀 키: `npx wrangler secret put SESSION_SECRET` → 최소 32자 이상의 무작위 문자열 입력. PIN과 동일한 값 사용 금지.
8. Worker 배포: `npx wrangler deploy` → 실제 `https://...workers.dev` 주소 확인.
9. 공개 웹 `alliance/config.json`의 `apiBase`에 위 Worker **주소만** 입력 후 GitHub 커밋. 비밀번호나 토큰은 입력하지 않음.
10. 페이지 새로고침 → 연맹장만 비밀번호 `7777`로 편집. 서버 DB 갱신 후 모든 조회자가 새로고침하면 변경된 내용 확인 가능.

## 보안 및 운영
- PIN `7777`은 쉽게 추측될 수 있으므로 낮은 보안 강도임. 연맹장 요청에 따라 서버 측 비밀값으로만 관리.
- 서버에서 IP별 15분 동안 로그인 실패 5회 후 15분 제한. 공격을 완전히 막는 것은 아니며 분산된 IP로 우회 가능.
- 인증 세션은 서명된 토큰으로 8시간. 토큰은 웹 탭 sessionStorage에만 저장.
- API는 지정된 `https://jhbahk.github.io` Origin에서만 로그인·수정 요청 허용.
- 수정마다 SQL 감사 로그 저장, 버전 불일치 시 동시 수정 차단, 건물 충돌·영역 검증.
- 공개 웹은 `data.json`에서 초기 지도를 표시. Worker 연결 후에는 실시간 D1을 우선 사용.
- 폐지줍기 저장소 및 `targets.json`, `current-course.json`, `course-progress.json`, 기존 웹 `index.html` 모두 수정하지 않음.
- 이 폴더는 기존 웹 저장소 내 별도 앱으로 분리되어 있지만, **GitHub 저장소 자체는 공유함**. 저장소까지 완전 분리하려면 새 `puzzle-of-z-alliance` 저장소를 별도로 만들어 이 폴더를 이전할 것.
