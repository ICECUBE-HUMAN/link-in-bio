import { ArrowRightIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	TESTIMONIAL_PROFILES,
	TESTIMONIAL_PROFILE_SLOTS,
	TESTIMONIAL_TOTAL_SLOTS,
} from "@/constant/testimonials";
import { cn } from "@/lib/shared/utils";
const avatarProfiles = TESTIMONIAL_PROFILES.slice(0, 11).map(({ image, url }) => ({
	image,
	url,
}));

export default function TestimonialSection() {
	return (
		<section className="min-h-lvh flex flex-col justify-center items-center gap-16 overflow-hidden">
			<div className="flex flex-col gap-6 items-center text-center">
				<h2 className="text-3xl font-semibold md:text-5xl">What our users are saying.</h2>
			</div>

			{/* Replace below to TweetCard */}
			<div className="relative w-full max-w-7xl">
				<div
					className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
					style={{
						WebkitMaskImage:
							"linear-gradient(to bottom, black 0%, black 62%, transparent 100%)",
						maskImage:
							"linear-gradient(to bottom, black 0%, black 62%, transparent 100%)",
					}}
				>
					{Array.from({ length: TESTIMONIAL_TOTAL_SLOTS }, (_, slot) => {
						const profileIndex = TESTIMONIAL_PROFILE_SLOTS.indexOf(slot);
						const profile =
							profileIndex === -1 ? null : TESTIMONIAL_PROFILES[profileIndex];

						if (!profile) {
							return (
								<div
									key={slot}
									className="hidden min-h-44 lg:block"
									aria-hidden="true"
								/>
							);
						}

						return (
							<a
								href={profile.url}
								key={slot}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(
									"flex flex-col gap-4 rounded-xl bg-secondary/50 p-6 lg:min-h-44",
									profileIndex >= 4 && "hidden sm:flex",
									profileIndex >= 6 && "sm:hidden lg:flex",
								)}
							>
								<div className="flex flex-row items-center gap-4">
									<img
										src={profile.image}
										alt={profile.name}
										className="size-12 rounded-full object-cover"
									/>
									<div className="flex flex-col">
										<p>{profile.name}</p>
										<p className="text-sm text-muted-foreground">
											{profile.username}
										</p>
									</div>
								</div>
								<p className="text-sm">{profile.review}</p>
							</a>
						);
					})}
				</div>
			</div>
		</section>
	);
}

export function TestimonialSection2() {
	return (
		<section className="h-[60vh] flex flex-col justify-center items-center gap-16">
			<div className="flex flex-col gap-6 items-center text-center">
				<h2 className="text-3xl font-semibold md:text-5xl">
					Join thousands of inspiring makers.
				</h2>
			</div>

			<div className="flex flex-row flex-wrap justify-center gap-6">
				{avatarProfiles.map((profile, idx) => (
					<Avatar
						key={idx}
						className="size-20"
						render={
							<a href={profile.url} target="_blank" rel="noopener noreferrer">
								<AvatarImage alt="User" src={profile.image} />
								<AvatarFallback />
							</a>
						}
					></Avatar>
				))}
			</div>

			<Button
				variant={"secondary"}
				size={"lg"}
				className={"text-lg font-semibold h-12 rounded-lg"}
			>
				<span>Explore the collection</span>
				<ArrowRightIcon />
			</Button>
		</section>
	);
}
