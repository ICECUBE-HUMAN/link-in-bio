import { pageItemUploadCompleteResponseSchema } from "@grabbin/api";
import { fetchBackend, getBackendRequestHeaders } from "@/lib/server/backend";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

// R2에 업로드된 Grid 미디어를 백엔드에 완료 처리하도록 전달합니다.
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  const headers = getBackendRequestHeaders(request);
  headers.set("content-type", "application/json");

  const result = await fetchBackend(
    `/pages/${encodeURIComponent(handle)}/items/upload/complete`,
    {
      method: "POST",
      headers,
      body: request.body,
    },
    pageItemUploadCompleteResponseSchema,
  );

  return result.response;
}
