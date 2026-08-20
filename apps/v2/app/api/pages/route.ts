import { createPage, createReadResponse } from "@/lib/server/page-queries";

export async function POST(request: Request) {
  const result = await createPage(await request.json(), request);
  return createReadResponse(result.response);
}
