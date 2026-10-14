import { describe, it, expect } from "vitest";
import { makeJWT, validateJWT } from "./auth.js";

describe("JWT", () => {
  const userID = "user-123";
  const secret = "test-secret";

  it("creates and validates a JWT", () => {
    const token = makeJWT(userID, 60, secret);

    expect(validateJWT(token, secret)).toBe(userID);
  });

  it("rejects an expired JWT", () => {
    const token = makeJWT(userID, -1, secret);

    expect(() => validateJWT(token, secret)).toThrow();
  });

  it("rejects a JWT signed with the wrong secret", () => {
    const token = makeJWT(userID, 60, secret);

    expect(() => validateJWT(token, "wrong-secret")).toThrow();
  });
});