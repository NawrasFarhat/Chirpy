import type { Request } from "express";
import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";


export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function checkPasswordHash(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return argon2.verify(hashedPassword, password);
}

export function getBearerToken(req: Request): string {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    throw new Error("missing Authorization header");
  }

  const [prefix, token] = authHeader.split(" ");

  if (prefix !== "Bearer" || !token) {
    throw new Error("invalid Authorization header");
  }

  return token.trim();
}

export function makeJWT(
  userID: string,
  expiresInSeconds: number,
  secret: string,
): string {
  return jwt.sign({}, secret, {
    subject: userID,
    expiresIn: expiresInSeconds,
  });
}

export function validateJWT(token: string, secret: string): string {
  const decoded = jwt.verify(token, secret);

  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("invalid JWT subject");
  }

  return decoded.sub;
}

export function makeRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function getAPIKey(req: Request): string {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    return "";
  }

  const [scheme, key] = authHeader.split(" ");

  if (scheme !== "ApiKey" || !key) {
    return "";
  }

  return key.trim();
}