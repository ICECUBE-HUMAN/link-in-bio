import { updatePageResponseSchema } from "@grabbin/api";
import {
  fetchBackend,
  fetchBackendResponse,
  getBackendRequestHeaders,
} from "@/lib/server/backend";
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

export async function DELETE(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const response = await fetchBackendResponse(
    `/pages/${encodeURIComponent(handle)}`,
    {
      method: "DELETE",
      headers: getBackendRequestHeaders(request),
    },
  );

  return response;
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
