import {
  fetchBackendResponse,
  getBackendRequestHeaders,
} from "@/lib/server/backend";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function forwardAuthRequest(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { path } = await params;
  return fetchBackendResponse(`/auth/${path.join("/")}`, {
    method: request.method,
    headers: getBackendRequestHeaders(request),
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : request.body,
  });
}

export const GET = forwardAuthRequest;
export const POST = forwardAuthRequest;
export const PATCH = forwardAuthRequest;
export const DELETE = forwardAuthRequest;
