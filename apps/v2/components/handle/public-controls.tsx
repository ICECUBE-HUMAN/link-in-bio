import type { PageResponse } from "@grabbin/api";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { widePageLayout } from "@/lib/handle/page-layout";
import { getPublicImageUrl } from "@/lib/seo-responses";
import type { PublicHandleModel } from "@/lib/server/public-handle-model";
import { OwnerControls } from "./owner-controls";
import { PublicViews } from "./public-views";

export function PublicControls({ model }: { model: PublicHandleModel }) {
  return (
    <aside
      className={`relative flex flex-col items-center gap-2 py-24 pt-0 z-10 min-[90rem]:flex-row min-[90rem]:py-0 ${widePageLayout.controls}`}
      aria-label="Page controls"
    >
      <div
        className={
          model.isSignedIn
            ? "flex flex-col items-center gap-2 min-[90rem]:flex-row min-[90rem]:gap-0"
            : "flex items-center gap-0"
        }
      >
        <div
          className={
            model.isSignedIn
              ? "order-2 flex flex-row items-center justify-center gap-1 min-[90rem]:order-none min-[90rem]:contents"
              : "contents"
          }
        >
          {model.isCurrentUserPage ? (
            <OwnerControls
              page={model.page}
              ownedPages={model.ownedPages}
              readOnly={model.readOnly}
              apiBaseUrl={env.NEXT_PUBLIC_API_BASE_URL}
              siteOrigin={env.NEXT_PUBLIC_APP_URL}
            />
          ) : !model.isSignedIn ? (
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/log-in?redirect=/${encodeURIComponent(model.page.handle)}`}
                />
              }
              variant="ghost"
              size="sm"
              className="rounded-md text-muted-foreground"
            >
              Log in
            </Button>
          ) : null}
          <Button
            nativeButton={false}
            render={
              <a
                href="https://discord.gg/U4NNF9hMms"
                target="_blank"
                rel="noreferrer"
              >
                Community
              </a>
            }
            variant="ghost"
            size="sm"
            className="rounded-md text-muted-foreground/80"
          />
          {model.visitorsEnabled ? (
            <PublicViews pageId={model.page.id} />
          ) : null}
        </div>
        {model.isSignedIn && !model.isCurrentUserPage ? (
          <MyPageLink page={model.primaryPage} />
        ) : null}
      </div>
    </aside>
  );
}

function MyPageLink({ page }: { page: PageResponse | null }) {
  if (!page) return null;

  const imageUrl = getPublicImageUrl(page.image, page.updatedAt);

  return (
    <Button
      nativeButton={false}
      render={<Link href={`/${encodeURIComponent(page.handle)}`} />}
      variant="ghost"
      size="sm"
      className="gap-1.5 rounded-md"
    >
      <Avatar size="xs">
        <AvatarImage src={imageUrl ?? undefined} alt="" />
        <AvatarFallback />
      </Avatar>
      {page.name}
    </Button>
  );
}
