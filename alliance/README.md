# BAM 연맹 배치도 · GitHub 직접 저장 관리자

## 접속 주소
- 공개 조회: https://jhbahk.github.io/puzzle-of-z-web/alliance/
- 관리 페이지: https://jhbahk.github.io/puzzle-of-z-web/alliance/admin.html
- 공개 웹 왼쪽 상단 노란 **B**를 탭하면 관리 페이지로 이동. 관리 페이지의 B를 탭하면 공개 화면으로 돌아감.
- 관리 페이지에는 별도 로그인 비밀번호 / PIN 입력이 없으며, 최초 한 번 GitHub 액세스 토큰으로 연결.

## 사용 방법 — 최초 한 번 (GitHub 계정이 없는 연맹장도 가능)
1. 저장소 관리자(JHBahk)가 https://github.com/settings/personal-access-tokens/new 에서 Fine-grained personal access token을 발급한다.
   - Resource owner: JHBahk
   - Repository access: **Only select repositories → `puzzle-of-z-web`** (주식 자동매매·폐지줍기 비공개 DB 권한 불필요).
   - Repository permissions: **Contents = Read and write**, Metadata = Read (자동 권한).
   - 다른 권한은 추가하지 않는다. 유효기간이 끝나면 새로 발급해야 한다.
2. 관리자가 토큰을 **안전한 경로**로 연맹장에게 전달한다. 토큰을 GitHub 공개 저장소나 채팅방, 스크린샷에 올리지 않는다.
3. 연맹장이 `/alliance/admin.html`에서 긴 토큰을 붙여넣고 **한 번 연결하기** 클릭.
4. 토큰은 해당 브라우저의 `localStorage`에 저장되어 같은 기기·브라우저에서 다음부터 자동 연결된다. GitHub 계정 로그인은 불필요하다.
5. 번호 선택 → **선택한 자리 수정하기** → 닉네임/X/Y 수정 → **변경사항 저장**.
6. 브라우저에서 GitHub Contents API로 `main:alliance/data.json`을 SHA 비교 후 갱신한다. 저장 직후 GitHub에서 재조회해 결과가 맞을 때만 성공으로 안내한다.
7. 다른 연맹원은 공개 페이지를 새로고침하여 바로 변경된 지도·닉네임을 확인할 수 있다. GitHub Pages 재배포를 기다리지 않고 GitHub API 최신 데이터 직접 조회를 우선 사용한다.

## 이 방식의 보안·제약
- Cloudflare/별도 DB/관리 비밀번호는 **사용하지 않는다**. 비밀번호 `7777`도 사용하지 않는다.
- 관리 페이지는 누구나 열 수 있지만 **실제 GitHub 저장은 권한 있는 토큰 없이 불가능**.
- 토큰은 브라우저 저장소에 보관하므로 기기 분실, 공용 기기, 악성 브라우저 확장·동일 웹 출처의 악성 스크립트에 주의. 토큰 유출 시 GitHub 설정에서 즉시 폐기.
- 토큰은 `puzzle-of-z-web` **저장소 전체 Contents 쓰기 권한**을 준다. **경로 `alliance/`만으로 제한할 수는 없다.** 폐지줍기 데이터는 `soxl-soxs-trading`의 다른 저장소에 있으며 그 권한은 부여하지 않는다.
- 기존 폐지줍기 웹의 소스 파일 `/index.html`도 같은 공개 웹 저장소에 있지만 이 관리 프로그램에서 수정하는 GitHub 파일은 오직 `alliance/data.json`이다.
- 동시에 여러 기기가 수정하면 오래된 SHA의 PUT을 거부하고 최신 GitHub 데이터 재조회 후 수정하도록 한다.
- 저장한 데이터는 Git 이력에 남고, 별도 백업은 관리 페이지의 `100좌표 백업 ↓`에서 JSON으로 다운로드 가능.
- 기존 구버전에서 저장했던 `bam_alliance_local_v2` 브라우저 로컬 편집 기록은 **신규 GitHub 직접 저장 방식에 자동 반영되지 않는다.** 필요한 경우 수동으로 대조 후 다시 입력한다.

## 기준 좌표 (V2, 100 HQ)
- 유일한 공유 데이터: `alliance/data.json`. 지휘센터 1~100번 번호는 좌표 수정 시에도 유지.
- 2×2 시설: 보루 (299,535), 음향 (297,533), 강철 (301,533), 창고 (313,537), 병원 (315,535).
- 1×1 전초: 1 (287,535), 2 (298,546), 3 (298,524), 4 (309,535).
- 확정 산: (299,531), (286,538), (300,548). 미확정 (318,538) 산은 기본 점유 검사 제외.
- 수정 시 건물 겹침, 동일 좌표 격자, 녹색 연맹 영역 검사. 배치도는 좌표 데이터에서 SVG로 매번 그린다.
- 닉네임은 3~4글자 권장, 최대 24글자. 게시 웹에서는 누구나 내용을 열람할 수 있다.

## 파일 구성
- `alliance/index.html` 공개 조회 (토큰 불필요)
- `alliance/admin.html` 관리자 페이지 (토큰 최초 1회 등록)
- `alliance/app.js` 지도·검증·GitHub 읽기/쓰기·재조회
- `alliance/style.css` 모바일 반응형 디자인
- `alliance/data.json` 좌표·닉네임 공유 단일 기준 데이터

관련 없는 폐지줍기 데이터 저장소, 전투 코스 및 주식 자동매매 코드는 수정하지 않는다.
