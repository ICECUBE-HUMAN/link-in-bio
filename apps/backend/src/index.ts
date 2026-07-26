import { authController } from "@controllers/auth.controller";
import { healthController } from "@controllers/health.controller";
import { pagesController } from "@controllers/pages.controller";
import { appFactory } from "@core/app-factory";
import { errorHandler } from "@middlewares/error-handler.middleware";
import { notFoundHandler } from "@middlewares/not-found.middleware";

const app = appFactory
	.createApp()
	.notFound(notFoundHandler)
	.onError(errorHandler)
	.route("/auth", authController)
	.route("/pages", pagesController)
	.route("/", healthController);

export type AppType = typeof app;

export default app;
