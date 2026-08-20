import type { ProfileImageCrop } from "@grabbin/api";
import { getProfileImageCropImageStyle } from "@/lib/image/crop-image";
import Image from "next/image";

export function ProfileImage({
  imageUrl,
  title,
  crop,
}: {
  imageUrl: string | null;
  title: string;
  crop?: ProfileImageCrop | null;
}) {
  const frameClassName =
    "relative flex size-28 items-center justify-center overflow-hidden rounded-full sm:size-32 min-[90rem]:size-46";

  if (!imageUrl) return <div className={frameClassName} />;

  return (
    <div className={frameClassName}>
      {crop ? (
        <div
          className="pointer-events-none rounded-lg"
          style={getProfileImageCropImageStyle(crop)}
        >
          <Image
            src={imageUrl}
            alt={title}
            width={150}
            height={150}
            className="size-full rounded-lg"
            loading="eager"
          />
        </div>
      ) : (
        <Image
          src={imageUrl}
          alt={title}
          width={150}
          height={150}
          className="size-full rounded-lg object-cover"
          loading="eager"
        />
      )}
    </div>
  );
}
