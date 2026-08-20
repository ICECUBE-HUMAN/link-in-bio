import { updatePageResponseSchema } from "@grabbin/api";
import { fetchBackend, getBackendRequestHeaders } from "@/lib/server/backend";
import { createReadResponse, getPageByHandle } from "@/lib/server/page-queries";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const result = await getPageByHandle(handle, request);
  return createReadResponse(result.response);
}

// 페이지 수정 요청을 인증 정보와 함께 백엔드로 전달합니다.
export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const result = await fetchBackend(
    `/pages/${encodeURIComponent(handle)}`,
    {
      method: "PATCH",
      headers: getBackendRequestHeaders(request),
      body: request.body,
    },
    updatePageResponseSchema,
  );

  return result.response;
}
