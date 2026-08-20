import { profileImageUploadResponseSchema } from "@grabbin/api";
import { fetchBackend, getBackendRequestHeaders } from "@/lib/server/backend";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

// 대표 이미지 업로드 시작 요청을 백엔드로 전달해 presigned URL을 받습니다.
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;

  const result = await fetchBackend(
    `/pages/${encodeURIComponent(handle)}/image-upload`,
    {
      method: "POST",
      headers: getBackendRequestHeaders(request),
      body: request.body,
    },
    profileImageUploadResponseSchema,
  );

  return result.response;
}
