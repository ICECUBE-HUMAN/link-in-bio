import type { creemSubscription } from "@db/schema";

const ACCESS_STATUSES = new Set([
	"active",
	"trialing",
	"paid",
]);

type Subscription = Pick<
	typeof creemSubscription.$inferSelect,
	| "status"
	| "productId"
	| "periodStart"
	| "periodEnd"
	| "cancelAtPeriodEnd"
>;

export type BillingStatusResponse =
	| {
			status: "none";
			hasAccess: false;
	  }
	| {
			status: string;
			hasAccess: boolean;
			productId: string;
			periodStart: string | null;
			periodEnd: string | null;
			cancelAtPeriodEnd: boolean;
	  };

const periodTime = (
	date: Date | null,
) =>
	date?.getTime() ??
	Number.NEGATIVE_INFINITY;

export const buildBillingStatus = (
	subscriptions: Subscription[],
	now = new Date(),
): BillingStatusResponse => {
	const subscription = [
		...subscriptions,
	].sort(
		(a, b) =>
			periodTime(b.periodEnd) -
			periodTime(a.periodEnd),
	)[0];

	if (!subscription) {
		return {
			status: "none",
			hasAccess: false,
		};
	}

	const status =
		subscription.status.toLowerCase();
	const periodActive =
		subscription.periodEnd === null ||
		subscription.periodEnd > now;
	const canceledWithinPeriod =
		status === "canceled" &&
		subscription.periodEnd !== null &&
		periodActive;

	return {
		status,
		hasAccess:
			periodActive &&
			(ACCESS_STATUSES.has(status) ||
				canceledWithinPeriod),
		productId: subscription.productId,
		periodStart:
			subscription.periodStart?.toISOString() ??
			null,
		periodEnd:
			subscription.periodEnd?.toISOString() ??
			null,
		cancelAtPeriodEnd:
			subscription.cancelAtPeriodEnd,
	};
};
