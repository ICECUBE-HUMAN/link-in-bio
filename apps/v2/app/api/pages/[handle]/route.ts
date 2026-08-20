import { updatePageResponseSchema } from "@grabbin/api";
import { fetchBackend, getBackendRequestHeaders } from "@/lib/server/backend";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

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
