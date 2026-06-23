import "cookie-session";

declare module "cookie-session" {
  interface CookieSessionObject {
    user?: { id: number; login: string; avatar_url: string };
    oauthState?: string;
    oauthNext?: string;
  }
}