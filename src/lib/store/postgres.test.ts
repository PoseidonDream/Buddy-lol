import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { withStrictSsl } from "./postgres";

describe("withStrictSsl", () => {
  it("asks for verify-full where pg would assume it anyway", () => {
    expect(withStrictSsl("postgresql://u:p@ep-x-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")).toBe(
      "postgresql://u:p@ep-x-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require",
    );
    expect(withStrictSsl("postgres://h/db?a=1&sslmode=prefer")).toBe("postgres://h/db?a=1&sslmode=verify-full");
    expect(withStrictSsl("postgres://h/db?sslmode=REQUIRE")).toBe("postgres://h/db?sslmode=verify-full");
  });

  it("leaves everything else exactly as it was", () => {
    for (const url of [
      "postgres://buddy:buddy@localhost:5432/buddy",
      "postgres://h/db?sslmode=disable",
      "postgres://h/db?sslmode=verify-full",
      "postgres://user:p%40ss%3Fsslmode=require@h/db",
      "postgres://h/db?sslmode=required-ish",
    ]) {
      expect(withStrictSsl(url)).toBe(url);
    }
  });
});
