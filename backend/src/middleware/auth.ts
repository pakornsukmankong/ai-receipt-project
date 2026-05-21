import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types";

const SUPABASE_URL = process.env.SUPABASE_URL;

const jwksClient = jwksRsa({
  jwksUri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  jwksClient.getSigningKey(header.kid!, (err, key) => {
    if (err) return callback(err);
    callback(null, key!.getPublicKey());
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      code: "NO_TOKEN",
      message: "กรุณาเข้าสู่ระบบก่อนใช้งาน",
    });
    return;
  }

  if (!SUPABASE_URL) {
    res.status(500).json({
      error: "Server configuration error",
      code: "CONFIG_ERROR",
      message: "ระบบยังไม่ได้ตั้งค่า authentication",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, getKey, { algorithms: ["ES256"] }, (err, decoded) => {
    if (err) {
      const isExpired = err.name === "TokenExpiredError";
      res.status(401).json({
        error: isExpired ? "Token expired" : "Invalid token",
        code: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
        message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
      });
      return;
    }

    const payload = decoded as jwt.JwtPayload;
    (req as AuthenticatedRequest).user = {
      id: payload.sub!,
      email: payload.email as string,
      role: payload.role as string,
    };
    next();
  });
}
