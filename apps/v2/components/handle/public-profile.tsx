import type { PageResponse } from "@grabbin/api";
import { env } from "@/lib/env";
import { getPublicImageUrl } from "@/lib/seo-responses";
import type { PublicHandleModel } from "@/lib/server/public-handle-model";
import { PrimaryPageAction } from "./primary-page-action";
import { ProfileEditor } from "./profile-editor";
import { ProfileImage } from "./profile-image";

export function getPublicPageTitle(page: PageResponse) {
  return page.name?.trim() || `@${page.handle}`;
}

export function getPublicPageDescription(page: PageResponse) {
  return (
    page.bio?.trim() ||
    `${getPublicPageTitle(page)} on Grabbin: links, media, and more.`
  );
}

export function PublicProfile({ model }: { model: PublicHandleModel }) {
  const title = getPublicPageTitle(model.page);
  const image = getPublicImageUrl(model.page.image, model.page.updatedAt);

  if (model.mode === "edit") {
    return (
      <ProfileEditor
        initialPage={model.page}
        imageUrl={image}
        imageBaseUrl={env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim() ?? null}
      />
    );
  }

  return (
    <>
      <div className="t-stagger-line t-stagger-line--1">
        <ProfileImage
          imageUrl={image}
          title={title}
          crop={model.page.imageCrop}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2 min-[90rem]:px-2">
        <p className="t-stagger-line t-stagger-line--2 text-3xl font-bold leading-tight tracking-tight min-[90rem]:text-[40px]">
          {title}
        </p>
        {model.page.bio?.trim() ? (
          <p className="t-stagger-line t-stagger-line--3 px-0.5 text-base leading-6 text-primary/80 min-[90rem]:text-xl min-[90rem]:leading-8">
            {model.page.bio.trim()}
          </p>
        ) : null}
        {model.readOnly && model.ownedPage && !model.ownedPage.isPrimary ? (
          <p className="text-base text-muted-foreground">
            Non-primary pages are read-only and will be deleted soon.
            <br />
            Upgrade your plan before these pages are deleted.
          </p>
        ) : null}
        {model.isCurrentUserPage &&
        model.ownedPages?.hasAccess &&
        model.ownedPage &&
        !model.ownedPage.isPrimary ? (
          <PrimaryPageAction handle={model.page.handle} />
        ) : null}
      </div>
    </>
  );
}
