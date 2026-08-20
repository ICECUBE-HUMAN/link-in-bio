import type { Metadata } from "next";
import { PublicControls } from "@/components/handle/public-controls";
import { PublicHandleShell } from "@/components/handle/public-handle-shell";
import {
  getPublicPageDescription,
  getPublicPageTitle,
  PublicProfile,
} from "@/components/handle/public-profile";
import Toolbar from "@/components/page/toolbar";
import { env } from "@/lib/env";
import { createProfilePageJsonLd } from "@/lib/seo/json-ld";
import { createMetadata, DEFAULT_SOCIAL_IMAGE } from "@/lib/seo/metadata";
import { getPublicImageUrl } from "@/lib/seo-responses";
import {
  getPublicHandleModel,
  requirePublicHandleModel,
} from "@/lib/server/public-handle-model";

type RouteProps = {
  params: Promise<{ handle: string }>;
};

function getPageImage(model: Awaited<ReturnType<typeof getPublicHandleModel>>) {
  return model
    ? (getPublicImageUrl(model.page.image, model.page.updatedAt) ??
        DEFAULT_SOCIAL_IMAGE)
    : DEFAULT_SOCIAL_IMAGE;
}

export async function generateMetadata({
  params,
}: RouteProps): Promise<Metadata> {
  const { handle } = await params;
  const model = await getPublicHandleModel(handle);
  if (!model) return {};

  const title = getPublicPageTitle(model.page);
  const description = getPublicPageDescription(model.page);
  const path = `/${encodeURIComponent(model.page.handle)}`;
  const image = getPublicImageUrl(model.page.image, model.page.updatedAt);

  return {
    ...createMetadata({
      title,
      description,
      canonicalPath: path,
      includeSiteName: false,
      image: image ?? DEFAULT_SOCIAL_IMAGE,
    }),
    icons: {
      icon: [
        {
          url: image
            ? `/api/favicon?image=${encodeURIComponent(image)}`
            : "/icon.svg",
          type: "image/svg+xml",
          sizes: "64x64",
        },
      ],
    },
  };
}

export default async function PublicHandlePage({ params }: RouteProps) {
  const { handle } = await params;
  const model = requirePublicHandleModel(await getPublicHandleModel(handle));
  const title = getPublicPageTitle(model.page);
  const description = getPublicPageDescription(model.page);
  const path = `/${encodeURIComponent(model.page.handle)}`;
  const siteOrigin = env.NEXT_PUBLIC_APP_URL;

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(
          createProfilePageJsonLd({
            title,
            handle: model.page.handle,
            description,
            path,
            image: getPageImage(model),
          }),
        )}
      </script>
      <PublicHandleShell
        profile={<PublicProfile model={model} />}
        grid={null}
        controls={<PublicControls model={model} />}
        toolbar={
          model.mode === "edit" ? (
            <Toolbar
              imageUrl={getPublicImageUrl(
                model.page.image,
                model.page.updatedAt,
              )}
              page={model.page}
              siteOrigin={siteOrigin}
            />
          ) : null
        }
      />
    </>
  );
}
