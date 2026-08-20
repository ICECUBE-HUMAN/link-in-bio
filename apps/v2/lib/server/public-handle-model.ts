import {
  isReservedPageHandle,
  normalizePageHandle,
  type OwnedPageListResponse,
  type PageItemResponse,
  type PageResponse,
} from "@grabbin/api";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  getMyPage,
  getOwnedPages,
  getPageByHandle,
  getSession,
} from "@/lib/server/page-queries";

export type PublicHandleModel = {
  page: PageResponse;
  items: PageItemResponse[];
  visitorsEnabled: boolean;
  isSignedIn: boolean;
  isCurrentUserPage: boolean;
  ownedPages: OwnedPageListResponse | null;
  ownedPage: OwnedPageListResponse["pages"][number] | null;
  primaryPage: PageResponse | null;
  readOnly: boolean;
  mode: "view" | "edit";
};

export const getPublicHandleModel = cache(
  async (rawHandle: string): Promise<PublicHandleModel | null> => {
    const handle = normalizePageHandle(rawHandle);
    if (isReservedPageHandle(handle)) return null;

    const [pageResult, sessionResult] = await Promise.all([
      getPageByHandle(handle),
      getSession(),
    ]);
    if (!pageResult.ok) {
      if (pageResult.response.status === 404) return null;
      throw new Error(
        `Failed to load public page: ${pageResult.response.status}`,
      );
    }

    if (!sessionResult.ok && sessionResult.response.status !== 401) {
      throw new Error(
        `Failed to load session: ${sessionResult.response.status}`,
      );
    }

    const session = sessionResult.ok ? sessionResult.data : null;
    const isSignedIn = Boolean(session?.user);
    const page = pageResult.data.page;
    const isCurrentUserPage = session?.user.id === page.userId;
    const ownedResult = isCurrentUserPage ? await getOwnedPages() : null;
    const primaryPageResult =
      isSignedIn && !isCurrentUserPage ? await getMyPage() : null;
    if (ownedResult && !ownedResult.ok) {
      if (ownedResult.response.status !== 401) {
        throw new Error(
          `Failed to load owned pages: ${ownedResult.response.status}`,
        );
      }
    }
    if (primaryPageResult && !primaryPageResult.ok) {
      if (primaryPageResult.response.status !== 401) {
        throw new Error(
          `Failed to load primary page: ${primaryPageResult.response.status}`,
        );
      }
    }

    const ownedPages = ownedResult?.ok ? ownedResult.data : null;
    const primaryPage = primaryPageResult?.ok
      ? primaryPageResult.data.page
      : null;
    const ownedPage =
      ownedPages?.pages.find((candidate) => candidate.handle === page.handle) ??
      null;
    const readOnly =
      isCurrentUserPage &&
      (!ownedPages ||
        !ownedPage ||
        (!ownedPages.hasAccess && !ownedPage.isPrimary));

    return {
      page,
      items: pageResult.data.items,
      visitorsEnabled: pageResult.data.visitorsEnabled === true,
      isSignedIn,
      isCurrentUserPage,
      ownedPages,
      ownedPage,
      primaryPage,
      readOnly,
      mode: isCurrentUserPage && !readOnly ? "edit" : "view",
    };
  },
);

export function requirePublicHandleModel(
  model: PublicHandleModel | null,
): PublicHandleModel {
  if (!model) notFound();
  return model;
}
