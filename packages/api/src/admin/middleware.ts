import type { MiddlewareHandler } from "hono";

// Reads ADMIN_API_KEY from env. If not set, admin routes are disabled.
export const adminAuth: MiddlewareHandler = async (c, next) => {
  const key = process.env["ADMIN_API_KEY"];
  if (!key) {
    return c.json({ error: "admin_disabled", message: "ADMIN_API_KEY not configured" }, 503);
  }
  const provided = c.req.header("X-Admin-Key");
  if (provided !== key) {
    return c.json({ error: "unauthorized", message: "Invalid admin key" }, 401);
  }
  await next();
};
