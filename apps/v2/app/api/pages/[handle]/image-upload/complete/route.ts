import { profileImageCompleteResponseSchema } from "@grabbin/api";
import { fetchBackend, getBackendRequestHeaders } from "@/lib/server/backend";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

// R2에 업로드된 대표 이미지를 백엔드에 완료 처리하도록 전달합니다.
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;

  const result = await fetchBackend(
    `/pages/${encodeURIComponent(handle)}/image-upload/complete`,
    {
      method: "POST",
      headers: getBackendRequestHeaders(request),
      body: request.body,
    },
    profileImageCompleteResponseSchema,
  );

  return result.response;
}
