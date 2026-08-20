import {
  fetchBackendResponse,
  getBackendRequestHeaders,
} from "@/lib/server/backend";

type RouteContext = {
  params: Promise<{ handle: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { handle } = await params;
  return fetchBackendResponse(`/pages/${encodeURIComponent(handle)}/primary`, {
    method: "PATCH",
    headers: getBackendRequestHeaders(request),
  });
}
