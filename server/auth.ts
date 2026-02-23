import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import * as oidcClient from "openid-client";
import { Strategy as OidcStrategy, type VerifyFunction } from "openid-client/passport";
import session from "express-session";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import memoize from "memoizee";
import { storage } from "./storage";
import type { Express, Request, Response, NextFunction } from "express";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      role: "admin" | "venue_holder" | "planner";
      suspended: boolean | null;
      approved: boolean | null;
      passwordHash: string | null;
      googleId: string | null;
      facebookId: string | null;
      appleId: string | null;
      avatarUrl: string | null;
      createdAt: Date | null;
    }
  }
}

const getOidcConfig = memoize(
  async () => {
    return await oidcClient.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export async function setupAuth(app: Express) {
  const PgStore = connectPgSimple(session);

  app.set("trust proxy", 1);

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required in production. Set it to a strong random string.");
  }
  const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
  if (!process.env.SESSION_SECRET) {
    console.warn("WARNING: SESSION_SECRET not set. Using random secret - sessions will not persist across restarts.");
  }
  app.use(session({
    store: new PgStore({
      pool: pool,
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: "sid",
    cookie: {
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) return done(null, false, { message: "Invalid email or password" });
        if (user.suspended) return done(null, false, { message: "Your account has been suspended. Please contact support." });
        if (!user.passwordHash) return done(null, false, { message: "This account uses social login. Please sign in with a social provider." });
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return done(null, false, { message: "Invalid email or password" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  if (process.env.REPL_ID) {
    try {
      await setupOidcAuth(app);
      console.log("OIDC auth (social login) setup complete");
    } catch (err) {
      console.error("Failed to setup OIDC auth:", err);
      app.get("/api/login", (_req, res) => {
        res.redirect("/auth?error=social_login_failed");
      });
      app.get("/api/callback", (_req, res) => {
        res.redirect("/auth?error=social_login_failed");
      });
    }
  } else {
    console.warn("REPL_ID not set — social login (Google, Apple, etc.) will not be available");
    app.get("/api/login", (_req, res) => {
      res.redirect("/auth?error=social_login_unavailable");
    });
    app.get("/api/callback", (_req, res) => {
      res.redirect("/auth?error=social_login_unavailable");
    });
  }

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || undefined);
    } catch (err) {
      done(err);
    }
  });
}

async function setupOidcAuth(app: Express) {
  const config = await getOidcConfig();
  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const verify: VerifyFunction = async (tokens, verified) => {
        try {
          const claims = tokens.claims?.();
          if (!claims) return verified(null, false);

          const email = claims.email as string;
          const sub = claims.sub as string;
          if (!email) {
            return verified(null, false);
          }

          let user = await storage.getUserByEmail(email);
          if (user) {
            if (user.suspended) return verified(null, false);
            if (user.role !== "planner") {
              return verified(null, false);
            }
            const avatarUrl = (claims as any).profile_image_url as string;
            if ((!user.googleId || !user.avatarUrl) && sub) {
              await storage.linkOAuthProvider(user.id, "google", sub, avatarUrl || undefined);
              user = await storage.getUser(user.id);
            }
            return verified(null, user || false);
          }

          const firstName = (claims as any).first_name as string || "";
          const lastName = (claims as any).last_name as string || "";
          const name = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];

          user = await storage.createOAuthUser({
            name,
            email,
            googleId: sub,
            avatarUrl: ((claims as any).profile_image_url as string) || null,
            role: "planner",
          });
          return verified(null, user);
        } catch (err) {
          return verified(err as Error);
        }
      };

      const strategy = new OidcStrategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/auth?error=social_login_failed",
    })(req, res, next);
  });
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const origin = req.get("origin");
  const referer = req.get("referer");
  const host = req.get("host");
  const sourceHost = origin || (referer ? new URL(referer).origin : null);
  if (!sourceHost) {
    if (req.is("application/json")) {
      return next();
    }
    return res.status(403).json({ message: "Forbidden: missing origin" });
  }
  try {
    const parsedHost = new URL(sourceHost).host;
    if (parsedHost !== host) {
      return res.status(403).json({ message: "Forbidden: origin mismatch" });
    }
  } catch {
    return res.status(403).json({ message: "Forbidden: invalid origin" });
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (req.user!.suspended) {
    req.logout(() => {});
    return res.status(403).json({ message: "Your account has been suspended." });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (req.user!.suspended) {
      req.logout(() => {});
      return res.status(403).json({ message: "Your account has been suspended." });
    }
    if (!roles.includes(req.user!.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    if (req.user!.role === "venue_holder" && req.user!.approved === false) {
      return res.status(403).json({ message: "Your account is pending admin approval." });
    }
    next();
  };
}
