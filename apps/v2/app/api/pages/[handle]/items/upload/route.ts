import { pageItemUploadResponseSchema } from "@grabbin/api";
import { fetchBackend, getBackendRequestHeaders } from "@/lib/server/backend";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

// Grid 미디어 업로드 시작 요청을 백엔드로 전달해 presigned URL을 받습니다.
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const headers = getBackendRequestHeaders(request);
  headers.set("content-type", "application/json");

  const result = await fetchBackend(
    `/pages/${encodeURIComponent(handle)}/items/upload`,
    {
      method: "POST",
      headers,
      body: request.body,
    },
    pageItemUploadResponseSchema,
  );

  return result.response;
}
