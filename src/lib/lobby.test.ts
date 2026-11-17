import { describe, expect, it } from "vitest";
import { lobbyToQuery, parseLobby } from "./lobby";

describe("parseLobby", () => {
  it("reads a block pasted from the lobby chat", () => {
    const text = [
      "Hide on bush #KR1 joined the lobby",
      "Mid Gap #NA1 joined the lobby",
      "Ward Bot #EUW left the lobby",
      "",
    ].join("\n");
    expect(parseLobby(text, "EUW").players).toEqual([
      { gameName: "Hide on bush", tagLine: "KR1" },
      { gameName: "Mid Gap", tagLine: "NA1" },
      { gameName: "Ward Bot", tagLine: "EUW" },
    ]);
  });

  it("reads comma-separated IDs and fills in missing tags", () => {
    expect(parseLobby("Buddy#LOL, Solo ,Duo#1234", "EUW").players).toEqual([
      { gameName: "Buddy", tagLine: "LOL" },
      { gameName: "Solo", tagLine: "EUW" },
      { gameName: "Duo", tagLine: "1234" },
    ]);
  });

  it("drops repeats, ignoring case", () => {
    expect(parseLobby("Buddy#LOL\nbuddy#lol joined the lobby\nBUDDY #LOL", "EUW").players).toHaveLength(1);
  });

  it("keeps the first five and counts the rest", () => {
    const text = Array.from({ length: 7 }, (_, i) => `Player ${i}#EUW`).join("\n");
    const result = parseLobby(text, "EUW");
    expect(result.players).toHaveLength(5);
    expect(result.players[4].gameName).toBe("Player 4");
    expect(result.dropped).toBe(2);
  });

  it("reports lines it cannot read", () => {
    expect(parseLobby("Good#EUW\n#oops\nbad/name#EUW", "EUW")).toMatchObject({
      players: [{ gameName: "Good", tagLine: "EUW" }],
      rejected: ["#oops", "bad/name#EUW"],
    });
  });

  it("writes and reads back the URL form", () => {
    const { players } = parseLobby("Mid Gap#NA1\nBuddy#LOL", "EUW");
    expect(lobbyToQuery(players)).toBe("Mid Gap#NA1,Buddy#LOL");
    expect(parseLobby(lobbyToQuery(players), "EUW").players).toEqual(players);
  });
});
