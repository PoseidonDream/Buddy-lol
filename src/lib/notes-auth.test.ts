import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { cleanName, notesEnabled, passwordMatches, readSession, signSession } from "./notes-auth";

describe("notes access", () => {
  beforeEach(() => vi.stubEnv("NOTES_PASSWORD", "correct horse"));
  afterEach(() => vi.unstubAllEnvs());

  it("is off without a password", () => {
    vi.stubEnv("NOTES_PASSWORD", "  ");
    expect(notesEnabled()).toBe(false);
    expect(passwordMatches("")).toBe(false);
    expect(readSession(signSession("Anil"))).toBeNull();
  });

  it("checks the password exactly", () => {
    expect(notesEnabled()).toBe(true);
    expect(passwordMatches("correct horse")).toBe(true);
    expect(passwordMatches("correct horse ")).toBe(false);
    expect(passwordMatches("Correct horse")).toBe(false);
    expect(passwordMatches("")).toBe(false);
  });

  it("reads back the name it signed, including spaces and accents", () => {
    for (const name of ["Anil", "Mate Two", "Çağrı", "a.b.c"]) {
      expect(readSession(signSession(name))).toBe(name);
    }
  });

  it("rejects forged, altered and empty cookies", () => {
    const real = signSession("Anil");
    expect(readSession(undefined)).toBeNull();
    expect(readSession("")).toBeNull();
    expect(readSession("Anil")).toBeNull();
    expect(readSession(`Someone${real.slice(real.indexOf("."))}`)).toBeNull();
    expect(readSession(`${real.slice(0, -2)}xx`)).toBeNull();
    expect(readSession("%E0%A4%A.sig")).toBeNull();
  });

  it("signs everyone out when the password changes", () => {
    const cookie = signSession("Anil");
    vi.stubEnv("NOTES_PASSWORD", "a new password");
    expect(readSession(cookie)).toBeNull();
  });

  it("tidies names", () => {
    expect(cleanName("  Anil   Uy  ")).toBe("Anil Uy");
    expect(cleanName(null)).toBe("");
    expect(cleanName("x".repeat(40))).toHaveLength(24);
  });
});
