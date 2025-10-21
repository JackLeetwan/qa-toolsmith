import { defineMiddleware } from "astro:middleware";
import { middlewareHandler } from "./middleware-handler";

export const onRequest = defineMiddleware(middlewareHandler);
