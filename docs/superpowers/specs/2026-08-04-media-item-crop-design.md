# 미디어 아이템 크롭 설계

## 목적

페이지 편집기의 `type = media` 아이템에 이미지와 비디오 모두 사용할 수 있는
크롭 기능을 추가한다. 사용자는 `ItemControls`의 Crop 버튼으로 현재 카드 안에서
미디어를 직접 드래그하고, 적용된 crop을 `wide`/`compact` breakpoint별로
저장한다.

크롭은 원본 미디어 파일을 재인코딩하지 않는다. 원본 R2 object는 유지하고,
원본 기준의 정규화된 crop 좌표를 `page_items.data`에 저장한 뒤 이미지와
비디오 렌더링에 적용한다.

## 현재 구조와 범위

- `page_items`는 `data`, `style`, `layouts`를 JSONB로 저장한다.
- media data에는 `objectKey`, `mimeType`, optional `caption`과 `link`가 있다.
- media 업로드는 presigned URL, R2 PUT, completion 이후 page-item batch 저장으로
  나뉘어 있다.
- `MediaItemRenderer`는 이미지와 비디오를 `object-cover`로 렌더링한다.
- `ItemControls`는 media의 preset/link/delete 조작을 제공한다.
- 현재 profile image crop은 원본 기준 percentage crop을 저장하고, 원본 object를
  유지한 채 crop geometry로 표시한다.

이번 작업의 범위는 media item crop의 shared contract, 카드 내부 편집 UI, 렌더링,
batch persistence, legacy compatibility와 수동 검증 기준이다.

## 결정 사항

### 1. Breakpoint별 crop 저장

`wide`와 `compact`는 서로 다른 카드 geometry를 사용하므로 crop을 독립적으로
저장한다.

```ts
type MediaCrop = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type PageItemMediaCrop = {
	wide?: MediaCrop;
	compact?: MediaCrop;
};
```

각 breakpoint crop은 해당 breakpoint에서 실제로 편집한 경우에만 존재할 수
있다. 존재하지 않는 값은 legacy item과 같은 중앙 `object-cover` 결과를
사용한다.

### 2. Media data JSONB 확장

현재 `page_items.data` JSONB 안에 `crop`을 추가한다. media 전용 SQL 컬럼이나
별도 crop table은 만들지 않는다.

```ts
type PageItemMediaData = {
	objectKey: string;
	mimeType: string;
	caption?: string;
	link?: string;
	crop?: PageItemMediaCrop;
};
```

따라서 PostgreSQL의 물리적인 `page_items` 컬럼 구조 migration은 필요하지
않다. logical schema는 공유 Valibot contract, backend model/mapper,
frontend batch serialization에서 변경한다.

### 3. 원본 유지와 metadata crop

크롭 Apply는 새 이미지 raster나 비디오 variant를 만들지 않는다.

- 원본 `objectKey`와 MIME은 유지한다.
- crop 좌표만 page-item batch에 포함한다.
- 이미지와 비디오는 같은 crop schema와 같은 absolute-layer 계산을 사용한다.
- 비디오 재인코딩, 서버 이미지 변환 pipeline, crop history는 범위에서 제외한다.

### 4. Crop frame은 현재 media preset과 동일

crop frame은 별도의 1:1 viewport가 아니다. 현재 breakpoint에서 media item에
적용된 preset geometry가 정하는 카드 영역과 정확히 같은 비율을 사용한다.

media preset은 `squareSmall`, `landscape`, `squareLarge`, `portrait` 중 하나이며,
현재 렌더링되는 `breakpoint`와 preset geometry를 기준으로 frame aspect를
계산한다. 실제 카드가 사용하는 grid row height와 grid margin을 포함한 카드
bounding box를 기준으로 삼아, crop frame과 카드의 외곽이 어긋나지 않게 한다.

- preset 변경은 layout operation과 crop frame 목표 비율을 함께 바꾼다.
- `wide`에서의 preset geometry와 `compact`에서의 preset geometry는 각자
  독립적으로 계산한다.
- crop 영역은 항상 카드 전체를 덮는 frame이다.
- crop 편집 중에는 profile image crop과 같이 frame 밖의 원본 image/video까지
  모두 보이도록 활성 media item의 clipping을 해제한다. frame 자체는 카드와
  같은 크기를 유지하며 `3px` 검은색 테두리로 경계를 표시한다. 원본은 profile
  image crop과 같은 `400ms` reveal easing으로 crop frame에서 전체 source 범위까지
  서서히 나타난다.
- 활성 crop frame과 reveal된 원본 media는 media card의 rounded 값을 상속한다.
  crop 중에는 기존 `surface-line`을 제거하고, frame 밖 원본 영역에 profile image
  crop과 같은 `rgb(255 255 255 / 0.35)` mask와 `smooth-shadow-lg`를 적용한다.
- reveal된 원본 전체는 하나의 crop drag surface로 동작한다. 이 surface는
  `cursor: grab`을 표시하고 뒤쪽 grid item으로 pointer hit-test가 통과하지 않게
  하며, 고정된 검은 frame border와는 별도 layer로 렌더링한다.
- crop 편집을 닫으면 카드 밖의 원본은 다시 숨기고 기존 card clipping을 복원한다.
- 기존에 저장된 crop의 실효 aspect가 새 preset 비율과 맞지 않으면, 저장된
  metadata를 즉시 바꾸지 않고 새 preset 기준의 임시 중앙 crop을 계산해 표시한다.
  사용자가 Apply할 때만 새 breakpoint crop으로 저장한다.

## 데이터 계약

### 공통 normalized crop

profile image 전용 `ProfileImageCrop` 검증을 공통 `NormalizedCrop` schema/type로
추출한다. 공통 schema는 다음을 보장한다.

- `x`, `y`, `width`, `height`는 0 이상 100 이하
- `width`와 `height`는 0보다 큼
- `x + width <= 100`
- `y + height <= 100`

media contract는 다음처럼 구성한다.

```ts
const pageItemMediaCropSchema = v.object({
	wide: v.optional(normalizedCropSchema),
	compact: v.optional(normalizedCropSchema),
});

const pageItemMediaDataSchema = v.object({
	objectKey: objectKeySchema,
	mimeType: mediaMimeTypeSchema,
	caption: v.optional(v.string()),
	link: v.optional(v.string()),
	crop: v.optional(pageItemMediaCropSchema),
});
```

upsert data와 response data가 같은 persisted crop contract를 사용한다.
response-only인 `mediaUrl`은 기존처럼 response schema에만 추가한다.

## 컴포넌트와 상태 구조

```text
GridItemShell
└─ MediaCropInteractionProvider
   ├─ ItemRenderer
   │  └─ MediaItemRenderer
   │     ├─ normal media layer
   │     ├─ preset-sized crop layer
   │     └─ Apply / Cancel affordance
   └─ ItemControls
      └─ Crop button
```

`GridItemShell`은 item 단위 crop interaction context를 제공한다. 이 context는
영속 데이터가 아닌 UI 상태만 소유한다.

- `isOpen`
- `open()`
- `cancel()`
- `apply()` 또는 renderer가 등록한 apply callback
- 현재 drag 중인지 여부

`ItemControls`의 Crop 버튼은 context를 열고, `MediaItemRenderer`는 context의
open 상태에 따라 카드 내부 편집 surface를 렌더링한다. 기존 map interaction
context와 같은 item-scoped 경계를 사용해 controls와 renderer 사이에 crop 상태를
전역으로 올리지 않는다.

## 사용자 흐름

### Crop 진입

1. 편집 모드의 media item에 Crop 버튼이 보인다.
2. 사용자가 Crop을 클릭한다.
3. 현재 breakpoint의 preset frame과 source media metadata를 확인한다.
4. 저장된 `crop[breakpoint]`가 있으면 복원한다.
5. 저장된 값이 없으면 source aspect와 preset frame aspect로 중앙 cover crop을
   계산한다.
6. crop surface를 활성화하고 RGL item drag를 차단한다.

### Drag와 적용

- crop frame 비율은 현재 preset이 결정하며 drag 중에도 고정된다.
- 1차 범위에서는 media 위치만 drag한다. zoom, resize handle, rotate와
  free-form ratio는 제공하지 않는다.
- drag 좌표는 `[0, 100 - width]`, `[0, 100 - height]` 범위로 clamp한다.
- Apply는 현재 breakpoint의 crop만 교체한 `update-data` command를 발행한다.
- command는 기존 editor store의 debounce/autosave를 통해
  `PATCH /pages/:handle/batch`에 포함된다.
- Apply 전에는 네트워크 요청이 없다.

### 취소와 상태 전환

- Cancel, Escape, 바깥 pointer down은 임시 crop 상태를 폐기한다.
- 취소는 persisted item data와 autosave queue를 변경하지 않는다.
- crop open 중에는 item controls를 계속 노출한다.
- breakpoint가 바뀌면 현재 crop edit를 취소하고 새 breakpoint의 crop을 연다.
- preset 변경으로 현재 frame aspect가 바뀌면 기존 crop을 강제로 재저장하지
  않는다. 새 preset 기준 중앙 crop을 표시하고, Apply 시에만 저장한다.

## Crop 계산과 렌더링

### 초기 중앙 crop

source natural size를 `sourceWidth / sourceHeight`, 현재 preset frame을
`frameWidth / frameHeight`로 둔다.

- source aspect가 frame aspect보다 넓으면 source 높이 전체를 사용하고 좌우를
  중앙에서 자른다.
- source aspect가 frame aspect보다 좁으면 source 너비 전체를 사용하고 상하를
  중앙에서 자른다.

그 결과를 원본 기준 percentage 영역으로 변환한다. 이 계산은 현재
`object-cover`의 시각적 결과와 동일한 초기값을 만든다.

### Media layer

crop이 적용된 일반 렌더링에서는 wrapper가 `overflow-hidden`을 유지하고,
image/video를 absolute layer로 배치한다. crop 편집 중에만 active media frame과
card의 overflow를 풀어 같은 absolute layer의 원본 전체를 frame 밖까지 reveal한다.
이때 crop frame은 이동하거나 커지지 않고 카드 bounding box를 그대로 유지한다.
단일 image/video element 위에 source bounds로 clipping된 연속 mask layer를
배치하고 rounded crop frame만 투명한 hole로 남긴다. 이 방식은 검은 테두리 바깥
네 꼭짓점도 mask에 포함하며 비디오 element를 복제하지 않는다. visual source와
mask는 profile image crop과 동일한 duration/easing의 inset clip-path animation으로
frame 영역에서 source 전체까지 reveal한다. shadow는 animation 바깥 wrapper에
적용해 reveal이 끝난 뒤에도 잘리지 않게 한다.

```ts
{
	position: "absolute",
	maxWidth: "none",
	width: `${(100 / crop.width) * 100}%`,
	height: `${(100 / crop.height) * 100}%`,
	left: `${(-crop.x / crop.width) * 100}%`,
	top: `${(-crop.y / crop.height) * 100}%`,
}
```

crop이 없거나 source metadata가 아직 없는 경우에는 기존 `size-full
object-cover` fallback을 사용한다.

- 이미지 source size는 `onLoad`에서 읽는다.
- 비디오 source size는 `onLoadedMetadata`에서 읽는다.
- 비디오는 기존 `autoPlay`, `muted`, `loop`, `playsInline` 동작을 유지한다.
- crop interaction surface에는 `data-grid-item-drag-cancel="true"`를 지정해
  grid drag와 pointer drag가 경쟁하지 않게 한다.
- interaction surface의 bounding box는 reveal된 source와 동일하게 잡아 frame 밖
  원본 위에서도 drag와 `grab` cursor가 유지되고 뒤쪽 item을 조작할 수 없게 한다.

## API·backend·DB 흐름

### Shared API

`packages/api/src/grid.ts`에서 공통 normalized crop과 media crop schema를
정의하고, 다음 계약을 확장한다.

- `pageItemMediaDataSchema`
- `pageItemMediaResponseDataSchema`
- media item upsert variant
- media item response variant

### Backend

- `apps/backend/src/models/item.model.ts`가 새 media contract를 사용한다.
- `page-item.service.ts`는 crop을 포함한 data를 기존 owner/MIME/object key
  검증 흐름으로 검증하고 response mapper에서 crop을 보존한다.
- object key ownership, upload completion, deletion Queue 경계는 변경하지
  않는다.
- 서버는 client가 보낸 crop 좌표를 다시 검증한다.

### Frontend batch

`apps/frontend/src/lib/grid/editor-store.ts`의 `toBatchItem()`은 media data에서
다음 항목을 보낸다.

- `objectKey`
- `mimeType`
- `caption`
- normalized `link`
- `crop`

`mediaUrl`은 response-only 값이므로 계속 payload에서 제거한다. pending item의
`objectKey = "pending"`는 기존처럼 batch에서 제외한다.

Gallery upload가 진행 중인 pending media에서 crop을 먼저 적용해도 crop은
로컬 item data에 남는다. upload completion은 objectKey와 MIME만 교체하고
기존 crop을 보존한다. 업로드 실패 시 기존 pending item 제거와 blob URL 정리
흐름을 유지한다.

## Legacy와 오류 처리

- 기존 media row에 `crop`이 없으면 현재 중앙 `object-cover` 결과를 그대로
  보여준다.
- source metadata를 얻기 전에는 crop Apply를 비활성화한다.
- 저장된 crop의 실효 aspect가 현재 preset과 다르면 새 preset 기준의 임시 중앙
  crop을 사용하고, Apply 전에는 persisted data를 변경하지 않는다.
- 잘못된 crop은 client clamp 후에도 server contract에서 재검증한다.
- Apply batch가 실패하면 임시 crop 상태와 오류 표시를 유지해 재시도할 수
  있게 하고, persisted item과 R2 object는 변경하지 않는다.
- 새 crop 저장은 별도 R2 object를 만들지 않으므로 orphan crop file 정리
  경계가 추가되지 않는다.

## 변경 대상

### Shared/API/backend

- `packages/api/src/grid.ts`
- `apps/backend/src/models/item.model.ts`
- `apps/backend/src/db/schema.ts`
- `apps/backend/src/services/page-item.service.ts`

### Frontend

- `apps/frontend/src/components/grid/item-controls.tsx`
- `apps/frontend/src/components/grid/grid-item-shell.tsx`
- 새 item-scoped crop interaction context
- `apps/frontend/src/components/grid/renderers/media.tsx`
- `apps/frontend/src/lib/grid/item-registry.ts`
- `apps/frontend/src/lib/grid/editor-store.ts`
- 공통 crop 계산/렌더링 helper

현재 media upload API와 `item-media.service.ts`는 crop metadata만 저장하는
흐름에 직접 관여하지 않으므로, upload object contract 변경 없이 유지한다.

## Verification checklist

### MEDIA-CROP-01 — Legacy media rendering

- Given: `crop`이 없는 기존 image/video media item이 있다.
- When: wide와 compact 페이지를 각각 확인한다.
- Then: 기존 중앙 `object-cover` 결과가 바뀌지 않는다.
- Evidence: 두 breakpoint의 화면 캡처와 page response의 media data.

### MEDIA-CROP-02 — Preset-sized crop entry

- Given: 편집 모드에서 media item의 preset이 정해져 있다.
- When: ItemControls의 Crop 버튼을 클릭한다.
- Then: crop frame이 현재 preset 카드 전체와 같은 크기와 비율로 열리고,
  frame 밖의 원본 전체가 옅은 흰색 mask와 함께 보인다. frame에는 media card의
  rounded를 상속한 `3px` 검은색 테두리가 표시되고 `surface-line`은 보이지 않는다.
  원본은 profile crop과 같은 `400ms` reveal motion으로 나타난다.
- Evidence: 카드와 crop frame bounding box 비교, frame 밖 원본의 visible 영역,
  crop frame의 computed border/radius, mask 색상, animation duration/easing,
  surface-line 유무.

### MEDIA-CROP-02A — Revealed source hit surface

- Given: crop 편집 중 reveal된 원본이 다른 grid item 위에 겹친다.
- When: frame 밖 원본 영역에 pointer를 올리고 drag한다.
- Then: 최상위 hit target은 현재 media item의 crop drag surface이며 cursor는
  `grab`/`grabbing`으로 바뀐다. 뒤쪽 item은 hover lift, control 노출, 클릭, drag가
  발생하지 않는다.
- Evidence: source/drag surface bounding box 비교, `elementsFromPoint`, computed
  cursor, 뒤쪽 item의 transform 및 control 상태.

### MEDIA-CROP-03 — Image apply and persistence

- Given: 이미지 media item의 wide crop 편집이 열려 있다.
- When: 이미지를 drag한 뒤 Apply를 클릭하고 autosave가 완료된다.
- Then: batch payload에 `data.crop.wide`가 포함되고 새로고침 후 같은 crop이
  복원된다.
- Evidence: PATCH request body, response item data, 새로고침 화면.

### MEDIA-CROP-04 — Video apply and playback

- Given: 비디오 media item이 있고 `loadedmetadata`가 완료되었다.
- When: compact crop을 drag하고 Apply한다.
- Then: 비디오가 기존 autoplay/muted/loop 동작을 유지하면서 저장된 crop으로
  표시된다.
- Evidence: video DOM attributes, 화면 crop, batch response.

### MEDIA-CROP-05 — Independent breakpoints

- Given: 같은 media item의 wide와 compact에 서로 다른 crop을 적용한다.
- When: breakpoint를 전환한다.
- Then: 각 breakpoint의 crop이 서로 간섭하지 않는다.
- Evidence: 각 breakpoint의 `data.crop` 값과 화면 캡처.

### MEDIA-CROP-06 — Cancel and interruption

- Given: crop 편집 중 임시 drag 상태가 있다.
- When: Cancel, Escape, 바깥 클릭 중 하나를 수행한다.
- Then: 기존 crop이 유지되고 PATCH 요청이 발생하지 않는다.
- Evidence: request log와 취소 전후 화면.

### MEDIA-CROP-07 — Preset change

- Given: crop이 저장된 media item의 preset을 변경한다.
- When: 새 preset으로 카드가 렌더링된다.
- Then: crop frame은 새 preset과 동일한 비율을 사용하고, 사용자가 Apply하기
  전에는 crop metadata가 자동으로 덮어써지지 않는다.
- Evidence: preset layout, crop frame bounding box, autosave payload.

### MEDIA-CROP-08 — Invalid crop rejection

- Given: client가 범위를 벗어난 crop metadata를 전송한다.
- When: page-item batch를 요청한다.
- Then: shared/backend validation이 요청을 거부하고 기존 item data를 변경하지
  않는다.
- Evidence: HTTP error response와 DB/page response.

프론트엔드 테스트 파일은 추가하지 않는다. backend contract/check와 기존
frontend typecheck/build, 위 브라우저 수동 시나리오를 완료 기준으로 사용한다.

## 제외 범위

- crop raster 또는 video variant 생성
- 서버-side media transformation pipeline
- zoom, rotate, resize handle, free-form ratio
- crop history와 undo/redo
- 별도 crop endpoint
- page_items의 media 전용 물리 컬럼
- 프론트엔드 테스트 파일
