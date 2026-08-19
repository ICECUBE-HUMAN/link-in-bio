# 지도 아이템 설계

## 목적

Sinabro grid의 지도 아이템을 좌표 placeholder가 아니라 Mapbox 기반의 실제 지도
아이템으로 교체한다. 사용자는 지도 아이템을 도쿄 기본 위치로 생성하고, 편집
상태에서 검색하거나 지도를 이동해 위치를 지정할 수 있다. 공개 페이지에서는
저장된 지도와 위치만 읽기 전용으로 표시한다.

이 문서는 2026-08-02 기준으로 현재 Sinabro 코드와 Mapbox/react-map-gl 공식
문서를 확인하고, 승인된 지도 아이템 요구사항을 구현 기준으로 정리한 것이다.

## 2026-08-02 controls 재배치 수정

지도 위치 편집의 진입점과 보조 조작을 지도 surface 위에 직접 배치하지 않고,
grid item controls로 이동한다. 지도 item shell 안에서만 사용할 수 있는 작은
interaction context가 controls와 renderer 사이의 UI 상태·Mapbox command
bridge를 소유한다. 따라서 여러 지도 item의 editing 상태가 섞이지 않으며,
기존 `update-data`와 RGL drag-cancel 경계도 유지된다.

- controls에는 `Maximize01Icon` 토글과 인접한 `Search01Icon` 버튼을 둔다.
- preset controls를 기본 그룹으로 먼저 표시하고, 텍스트·미디어의 link control과
	지도 controls 같은 추가 controls는 `toolbar.tsx`의 vertical `Separator`
	스타일로 구분한 뒤 오른쪽에 표시한다.
- `Maximize01Icon`의 active 상태는 기존 preset control의 active 스타일
  (`bg-white text-black`)을 사용한다. 토글이 켜진 동안에만 지도 drag/zoom과
  current-location 조작이 활성화된다.
- Maximize popover content 안에는 `MinusSignIcon`, `PlusSignIcon`,
  `Gps01Icon` 버튼을 둔다. 이 버튼들은 지도 surface 위에 렌더링하지 않는다.
- Search popover content 안에는 기존 `MapLocationSearch`를 둔다. 검색 결과
  선택은 renderer의 기존 camera commit/flyTo 경계를 호출하며, 검색 선택 시
  위치 편집을 자동으로 활성화한다.
- 두 popover는 controls 아래에 열고, content는 controls와 동일한 `bg-black`,
  `h-10`, `p-1`, `rounded-lg`, gap/density를 사용한다. 내부 icon button은
  controls와 같은 `icon-sm` 크기와 `size-4` icon을 사용한다.
- 지도 renderer에서는 기존 `Edit location` 버튼, 검색 UI, zoom/current-location
  버튼을 제거한다. 중앙 pin만 시각적 overlay로 유지한다.
- popover trigger/content는 기존 grid item drag-cancel selector에 포함되며,
  `aria-pressed`/`aria-expanded`/accessible label을 제공한다.

## 현재 경계

- `apps/frontend/src/components/grid/renderers/map.tsx`는 현재 좌표와 caption을
  표시하고 Google Maps 외부 링크를 제공하는 placeholder renderer다.
- `apps/frontend/src/lib/grid/item-factory.ts`는 새 map item을
  `37.5665, 126.978`(서울)로 생성한다.
- `packages/api/src/grid.ts`의 map data contract는
  `latitude`, `longitude`, optional `caption`만 저장한다.
- `item-registry.ts`는 map item을 기존 `ItemRenderer`/`GridItemShell` 경계에
  등록하고, `update-data` command를 통해 item data를 변경한다.
- page item persistence는 공통 API DTO와 기존 autosave 흐름을 사용한다.
- wide/compact grid layout은 지도 기능과 독립적으로 유지한다. 지도 카메라의
  위치·zoom은 breakpoint별로 나누지 않는다.
- 지도 검색은 새 backend endpoint를 만들지 않고, 브라우저에서 Mapbox API를
  직접 호출한다.

## 결정 사항

### 지도 엔진과 스타일

- 지도 엔진: `mapbox-gl`
- React wrapper: `react-map-gl/mapbox`
- mapcn과 `maplibre-gl`은 사용하지 않는다.
- 앱 전체 지도 style URL은 다음 값을 사용한다.

  `mapbox://styles/justhumanb2ing/cmk406try001601pr180409zf`

- Mapbox access token은 `VITE_MAPBOX_ACCESS_TOKEN` public client variable로
  주입하고, Mapbox console에서 개발·운영 도메인 제한을 설정한다.
- `env.ts`에서는 `VITE_MAPBOX_ACCESS_TOKEN`을 optional client variable로
  읽고, 값이 없을 때는 runtime fallback을 표시한다. production deployment는
  token을 제공해야 한다.
- mapbox-gl은 `mapLib={import("mapbox-gl")}`로 lazy bundle에 넣는다.
- `mapbox-gl/dist/mapbox-gl.css`를 애플리케이션 stylesheet에 포함한다.
- 지도는 `projection="mercator"`를 명시하고 pitch를 0으로 고정한다.
  `dragRotate`, `touchPitch`, compass 표시를 비활성화하여 지구본이나 3D
  탐색 경험을 만들지 않는다.

근거:

- [react-map-gl Get Started](https://visgl.github.io/react-map-gl/docs/get-started)는
  Mapbox 진입점과 `mapbox-gl` 설치, `mapboxAccessToken`, `mapbox://` style URL,
  stylesheet 사용을 안내한다.
- [react-map-gl Map API](https://visgl.github.io/react-map-gl/docs/api-reference/mapbox/map)는
  Mapbox 동적 import를 통한 bundle splitting과 Mercator projection, camera/input
  옵션을 제공한다.
- [react-maplibre 저장소](https://github.com/visgl/react-maplibre)는 archived 상태이며
  소스와 최신 릴리스가 `react-map-gl`로 통합되었다.

### 검색 API

Mapbox Geocoding API v6의 forward endpoint를 직접 사용한다.

- 검색 범위: 전 세계 도시·주소 중심
- 검색 요청: `q`, `autocomplete=true`, `limit=5`, 현재 UI 언어
- 최소 입력 길이: 2자
- debounce를 적용하고, 새 검색이 시작되면 이전 `fetch`를
  `AbortController`로 취소한다.
- 결과 선택 시 provider response 전체나 `mapbox_id`는 저장하지 않는다.
- 검색 결과에서 필요한 좌표만 `latitude`, `longitude`로 변환한다.

Search Box API는 POI와 interactive autocomplete에 강점이 있지만, 기본 결과가
temporary 용도이고 위치 데이터를 저장하려면 Mapbox sales 확인이 필요하다.
현재 요구사항은 선택한 검색 결과 좌표를 map item에 저장해야 하므로 Geocoding
API v6를 선택한다. Geocoding v6에서 영구 저장이 필요한 검색 결과는
`permanent=true` 조건을 계정에서 충족해야 하며, 이를 충족하지 못하는 경우
temporary 결과를 조용히 DB에 저장하지 않는다.

근거:

- [Mapbox Geocoding API](https://docs.mapbox.com/api/search/geocoding/)는 forward /
  reverse geocoding, autocomplete, 좌표 response, temporary/permanent 저장
  정책을 정의한다.
- [Mapbox Search Box API](https://docs.mapbox.com/api/search/search-box/)는
  `/suggest`와 `/retrieve` 세션, POI search, temporary 결과 제한을 정의한다.

### Map item data contract

map data는 다음 형태로 확장한다.

```ts
{
  latitude: number;
  longitude: number;
  zoom?: number;
  caption?: string;
}
```

- 새 map item의 기본 위치: 도쿄 중심 `latitude: 35.6762`,
  `longitude: 139.6503`
- 새 map item의 기본 zoom: `12`
- `zoom`은 기존 map item과의 호환을 위해 API schema에서 optional로 읽고,
  값이 없으면 `12`를 사용한다.
- 새로 생성하거나 위치를 편집한 map item은 `zoom`을 저장한다.
- zoom은 Mapbox 기본 범위에 맞춰 `0..22`로 검증하고, 지도 component에도 같은
  범위를 적용한다.
- pitch와 bearing은 저장하지 않는다.
- 검색 provider의 label은 `caption`을 위한 입력값일 뿐, provider ID나 전체
  feature object를 저장하지 않는다.
- 기존 `toGoogleMapsUrl(latitude, longitude)`와 외부 Google Maps action은
  유지한다. Mapbox 로딩에 실패해도 저장된 위치를 열 수 있어야 한다.

`packages/api/src/grid.ts`의 shared schema, frontend grid types, item factory,
backend response validation을 함께 갱신한다. 별도 DB table이나 검색 endpoint는
추가하지 않는다.

## 컴포넌트와 책임

```text
MapItemRenderer
├─ MapItemViewportGate
│  └─ visible placeholder / lazy Mapbox mount
├─ MapboxMapSurface
│  ├─ Map from react-map-gl/mapbox
│  └─ fixed center pin overlay
└─ MapItemInteractionContext bridge
   ├─ ItemControls: Maximize/Search triggers and popover content
   └─ update-data/flyTo/geolocate callbacks registered by renderer
```

- `MapItemRenderer`는 현재 item registry의 renderer 경계를 유지한다.
- `MapboxMapSurface`는 Mapbox 초기화, style, camera, 2D input 설정만 담당한다.
- `MapItemInteractionContext`는 하나의 map item shell 안에서만 editing 상태와
  renderer callback을 공유한다. global store나 item data persistence에는
  사용하지 않는다.
- `ItemControls`의 map branch는 Maximize/Search popover와 Hugeicons controls를
  담당한다. 검색 요청과 결과 list는 기존 `MapLocationSearch`를 재사용한다.
- fixed center pin은 지도 내부 좌표에 붙는 Mapbox `Marker`가 아니라 map container
  중앙에 놓이는 DOM overlay다. 지도 이동 중에도 핀은 화면 중앙에 고정한다.
- zoom/current-location command는 Mapbox surface ref를 통해 controls popover에서
  호출하며 Mapbox 기본 control DOM은 렌더링하지 않는다.
- controls의 editing state는 item toolbar의 preset/delete command와 분리한다.
  state는 persistence하지 않는 local UI state다.
- location editing이 활성화되면 map surface wrapper에
  `data-grid-item-drag-cancel="true"`를 적용해 map gesture가 RGL item drag로
  해석되지 않게 한다. toggle button과 search controls도 기존 interactive target
  규칙으로 grid drag를 취소한다.

공식 wrapper는 Mapbox control을 제공한다.

- [NavigationControl](https://visgl.github.io/react-map-gl/docs/api-reference/mapbox/navigation-control)
- [GeolocateControl](https://visgl.github.io/react-map-gl/docs/api-reference/mapbox/geolocate-control)

## 상호작용 상태

### 보기 모드

- 지도는 완전한 read-only다.
- drag pan, scroll zoom, double-click zoom, keyboard camera input을 끈다.
- 검색 UI, 위치 편집 toggle, NavigationControl, GeolocateControl을 표시하지
  않는다.
- 저장된 `latitude`, `longitude`, `zoom`, `caption`만 지도에 반영한다.
- view mode의 camera 동작은 item data를 변경하지 않는다.

### 편집 모드: location editing 잠금

- 지도는 기본적으로 잠긴다. controls의 `Maximize01Icon` 토글과
  `Search01Icon` 버튼만 표시한다.
- `Maximize01Icon`을 켜기 전에는 검색 popover를 열 수 있지만, 지도를 직접
  이동시키는 조작은 잠겨 있다.
- zoom/current-location control은 Maximize popover가 열려 있을 때만 표시한다.
- 기존 grid drag cancellation 규칙과 충돌하지 않도록 map canvas는 잠금 상태에서
  grid item drag를 방해하지 않는다.

### 편집 모드: location editing 활성화

toggle을 켜면 다음을 활성화한다.

- fixed center pin
- map drag pan과 zoom
- Maximize popover 안의 zoom in/out/current-location buttons

Search popover를 열면 기존 location search input과 result list를 표시한다.
검색 결과를 선택하면 renderer가 location editing을 활성화하고 camera를
선택 좌표로 이동시킨다. Search popover 자체는 Maximize popover와 독립적으로
열리고 닫힌다.

지도 카메라 입력은 Mapbox map instance의 `dragPan`, `scrollZoom`,
`doubleClickZoom`, `keyboard` handler를 toggle state에 맞춰 enable/disable한다.
pitch와 rotation handler는 항상 비활성화한다.

## 데이터 흐름

### 지도 드래그와 zoom

1. 사용자가 controls의 `Maximize01Icon` 토글을 켠다.
2. 중앙 핀 아래로 지도를 이동하거나 Maximize popover의 zoom button을 누른다.
3. Mapbox `moveend`에서 최종 camera center와 zoom을 읽는다.
4. `update-data` command로 `latitude`, `longitude`, `zoom`을 한 번에 갱신한다.
5. 기존 editor store가 변경된 map item만 autosave한다.
6. 같은 camera 값이면 command를 생략해 중복 저장을 막는다.

### 검색 결과 선택

1. 검색어가 2자 이상이고 debounce가 끝나면 Geocoding v6 forward request를
   전송한다.
2. 결과 목록에는 provider의 이름과 주소를 표시한다.
3. 사용자가 결과를 선택하면 map camera를 선택 좌표로 이동한다.
4. 현재 zoom을 유지한다. 새 item의 최초 zoom은 12다.
5. 선택한 좌표와 현재 zoom을 즉시 `update-data` command로 반영한다.
6. camera animation이 끝난 뒤 발생하는 `moveend`는 동일 값 비교로 중복 저장하지
   않는다.
7. caption이 비어 있을 때만 검색 결과 이름 또는 주소를 caption으로 입력한다.
   이미 사용자가 작성한 caption은 보존한다.

### 현재 사용자 위치

1. Maximize popover가 열린 상태에서 `Gps01Icon`을 누른다.
2. 브라우저 Geolocation API의 권한 요청을 처리한다.
3. 위치 조회가 성공하면 Mapbox가 카메라를 사용자 위치로 이동한다.
4. 성공한 `longitude`, `latitude`와 현재 zoom을 map item에 저장한다.
5. 권한 거부나 위치 오류가 발생하면 기존 item data를 그대로 유지하고 오류
   메시지만 표시한다.

현재 사용자 위치 이동은 view mode에서 사용할 수 없으며, location editing 상태의
위치 지정 동작으로만 취급한다.

## 공개 페이지 lazy mount

- 공개 page의 각 map card는 카드 크기를 먼저 확보한 lightweight placeholder로
  렌더링한다.
- `IntersectionObserver`의 `rootMargin: "200px"` near-viewport 진입을 기준으로
  Mapbox surface를 mount한다.
- 최초 near-viewport 진입 전에 `mapbox-gl` chunk와 style 요청을 시작하지 않는다.
- map surface가 viewport 밖으로 벗어나면 unmount하고, 재진입 시 저장된 좌표와
  zoom으로 복원한다.
- 현재 viewport에 있는 지도만 live Mapbox instance를 유지해 초기 render와
  offscreen memory를 제한한다.
- edit mode에서는 위치 편집 toggle을 켠 map item을 우선 live mount한다.
- lazy mount 중에는 Mapbox failure가 카드 높이·grid layout을 바꾸지 않도록
  placeholder와 fallback의 크기를 동일하게 유지한다.

`reuseMaps`는 1차 구현에서 사용하지 않는다. 지도 instance를 모두 보존하면
offscreen memory가 늘어나므로, 좌표·zoom을 source of truth로 두고 필요할 때
재생성한다.

## 오류 및 fallback

| 상황 | 사용자 경험 | 데이터 처리 |
| --- | --- | --- |
| token 누락/거부 | fallback card와 Google Maps action | 기존 item data 유지 |
| custom style 로드 실패 | fallback card와 재시도 안내 | 기존 item data 유지 |
| 지도 dynamic import 실패 | fallback card | 기존 item data 유지 |
| 검색 결과 없음 | 결과 없음 상태 | data 변경 없음 |
| 검색 network/rate-limit 오류 | 검색 영역의 재시도 상태 | data 변경 없음 |
| Geolocation 권한 거부 | 위치 권한 안내 | data 변경 없음 |
| Geolocation 위치 오류 | 위치를 확인할 수 없음 안내 | data 변경 없음 |
| autosave 실패 | 기존 editor save error UI 사용 | draft는 유지하고 재시도 가능 |

지도 fallback은 현재의 좌표 표시와 Google Maps 외부 action을 보존한다. 검색
provider 오류를 지도 renderer 전체 오류로 전파하지 않고 검색 영역 안에서
격리한다.

## 접근성과 상호작용 세부 규칙

- `Maximize01Icon` toggle은 `aria-pressed`, `aria-expanded`와 명확한 label을
  제공한다.
- `Search01Icon` trigger는 `aria-expanded`와 `aria-controls`를 제공한다.
- search input은 label을 가지며, 결과 list는 keyboard arrow/Enter/Escape로
  조작할 수 있다.
- 결과 loading, empty, error 상태는 polite live region으로 알린다.
- fixed center pin은 pointer events를 가로채지 않으며, 시각적 장식으로
  `aria-hidden` 처리한다. 현재 선택 좌표는 텍스트 상태로 별도 제공한다.
- Mapbox controls는 공식 accessible button을 사용한다.
- 검색 선택의 `flyTo`는 reduced-motion 환경에서 즉시 이동한다.
- 캡션 편집은 기존 contentEditable과 `update-data` 경계를 유지한다.
- 지도 canvas가 grid item drag를 가로채지 않도록 location editing이 꺼진 상태의
  interactive target을 명시적으로 관리한다.

## 검증 계획

프론트엔드 테스트는 저장소 규칙에 따라 추가하지 않는다. 다음 static check와
브라우저 수동 QA를 사용한다.

### Static check

- `bun run --filter @grabbin/frontend typecheck`
- `bun run --filter @grabbin/frontend check`
- `bun run --filter @grabbin/frontend build`
- shared API schema와 backend response validation check

### Manual QA checklist

#### MAP-001: 기본 생성

- Given 편집 페이지에서 Map toolbar action이 보인다.
- When Map item을 생성한다.
- Then Tokyo center와 zoom 12로 생성되고, location editing은 잠겨 있다.

#### MAP-002: 보기 모드 read-only

- Given 공개 page에 지도 아이템이 표시된다.
- When 지도 위에서 드래그·스크롤·더블클릭을 시도한다.
- Then camera가 움직이지 않고 control/search UI도 보이지 않는다.

#### MAP-003: controls 위치 편집 toggle

- Given 편집 모드의 지도 item이 잠겨 있다.
- When controls의 `Maximize01Icon`을 켠다.
- Then active preset 스타일과 Maximize popover가 표시되고, 그 content 안에
  `MinusSignIcon`, `PlusSignIcon`, `Gps01Icon`이 표시되며 drag/zoom이
  활성화된다. 지도 위에는 해당 버튼이 표시되지 않는다.

#### MAP-004: 지도 이동 저장

- Given 위치 편집이 활성화되어 있다.
- When 지도를 드래그하거나 zoom을 변경하고 손을 뗀다.
- Then 최종 center와 zoom만 `update-data`로 반영되고 autosave된다.

#### MAP-005: controls 장소 검색

- Given 편집 모드에서 controls가 표시되어 있다.
- When `Search01Icon`을 누르고 `Seoul`을 검색한 뒤 결과를 선택한다.
- Then Search popover 안에서 결과가 표시되고, 선택 시 위치 편집이 활성화되어
  선택한 좌표로 지도가 이동하며 latitude/longitude/zoom이 저장된다.

#### MAP-006: 검색 caption

- Given caption이 비어 있거나 사용자가 직접 입력한 상태다.
- When 검색 결과를 선택한다.
- Then 빈 caption만 결과 이름/주소로 채워지고, 기존 caption은 보존된다.

#### MAP-007: 현재 위치 저장

- Given 위치 편집이 활성화되어 있고 위치 권한을 허용한다.
- When current-location control을 누른다.
- Then 사용자 위치로 카메라가 이동하고 그 좌표와 zoom이 item에 저장된다.

#### MAP-008: 현재 위치 거부

- Given 브라우저 위치 권한을 거부한다.
- When current-location control을 누른다.
- Then 오류 안내가 표시되고 기존 item 좌표와 caption은 변경되지 않는다.

#### MAP-009: lazy mount와 fallback

- Given 여러 지도 아이템이 있는 public page다.
- When viewport를 이동하고 token/style 오류를 재현한다.
- Then visible map만 live mount되고 offscreen card는 placeholder이며, 오류 card도
  grid geometry와 Google Maps action을 유지한다.

#### MAP-010: 기존 데이터 호환

- Given zoom이 없는 기존 map item이 있다.
- When public/editor page를 로드한다.
- Then zoom 12로 표시되고, 다음 위치 변경부터 zoom이 저장된다.

## 외부 선행 조건

- Mapbox account에 custom style 접근 권한과 URL 제한 public token이 있어야 한다.
- 검색 좌표를 저장하려면 Geocoding API permanent storage 사용 조건을 계정에서
  확인해야 한다.
- production domain과 local development origin을 Mapbox token restriction에
  등록해야 한다.

이 조건이 충족되지 않으면 temporary geocoding 결과를 map item persistence에
  저장하지 않고, search 기능은 account 조건을 해결한 뒤 활성화한다.

## 범위 제외

- Mapbox Search Box API 기반 POI/category 검색
- 한국 전용 Kakao/Naver 검색 provider fallback
- 사용자별 지도 style 선택
- pitch, bearing, 3D globe, terrain
- route/directions, 거리 측정, 장소 목록 관리
- 검색 provider metadata의 영구 저장
- 별도 backend geocoding proxy와 server-side cache
