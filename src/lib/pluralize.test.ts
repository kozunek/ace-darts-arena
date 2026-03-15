import { describe, it, expect } from "vitest";
import { pluralize, pluralizeAdj, pl, adj } from "./pluralize";

describe("pluralize", () => {
  it("returns singular for 1", () => {
    expect(pluralize(1, "mecz", "mecze", "meczów")).toBe("1 mecz");
  });

  it("returns paucal for 2, 3, 4", () => {
    expect(pluralize(2, "mecz", "mecze", "meczów")).toBe("2 mecze");
    expect(pluralize(3, "mecz", "mecze", "meczów")).toBe("3 mecze");
    expect(pluralize(4, "mecz", "mecze", "meczów")).toBe("4 mecze");
  });

  it("returns plural for 5-21", () => {
    expect(pluralize(5, "mecz", "mecze", "meczów")).toBe("5 meczów");
    expect(pluralize(11, "mecz", "mecze", "meczów")).toBe("11 meczów");
    expect(pluralize(14, "mecz", "mecze", "meczów")).toBe("14 meczów");
    expect(pluralize(21, "mecz", "mecze", "meczów")).toBe("21 meczów");
  });

  it("returns paucal for 22, 23, 24 (not 12-14)", () => {
    expect(pluralize(22, "mecz", "mecze", "meczów")).toBe("22 mecze");
    expect(pluralize(23, "mecz", "mecze", "meczów")).toBe("23 mecze");
    expect(pluralize(24, "mecz", "mecze", "meczów")).toBe("24 mecze");
  });

  it("returns plural for 12, 13, 14 (teen exception)", () => {
    expect(pluralize(12, "mecz", "mecze", "meczów")).toBe("12 meczów");
    expect(pluralize(13, "mecz", "mecze", "meczów")).toBe("13 meczów");
    expect(pluralize(14, "mecz", "mecze", "meczów")).toBe("14 meczów");
  });

  it("handles negative numbers", () => {
    expect(pluralize(-1, "mecz", "mecze", "meczów")).toBe("-1 mecz");
    expect(pluralize(-2, "mecz", "mecze", "meczów")).toBe("-2 mecze");
    expect(pluralize(-5, "mecz", "mecze", "meczów")).toBe("-5 meczów");
  });
});

describe("pluralizeAdj", () => {
  it("returns singular adjective for 1", () => {
    expect(pluralizeAdj(1, "nowy", "nowe", "nowych")).toBe("nowy");
  });

  it("returns paucal adjective for 2, 3, 4", () => {
    expect(pluralizeAdj(2, "nowy", "nowe", "nowych")).toBe("nowe");
    expect(pluralizeAdj(3, "nowy", "nowe", "nowych")).toBe("nowe");
    expect(pluralizeAdj(4, "nowy", "nowe", "nowych")).toBe("nowe");
  });

  it("returns plural adjective for 5+", () => {
    expect(pluralizeAdj(5, "nowy", "nowe", "nowych")).toBe("nowych");
    expect(pluralizeAdj(12, "nowy", "nowe", "nowych")).toBe("nowych");
  });

  it("returns paucal for 22-24 (not teen)", () => {
    expect(pluralizeAdj(22, "nowy", "nowe", "nowych")).toBe("nowe");
  });
});

describe("pl noun helpers", () => {
  it("pl.match", () => {
    expect(pl.match(1)).toBe("1 mecz");
    expect(pl.match(2)).toBe("2 mecze");
    expect(pl.match(5)).toBe("5 meczów");
  });

  it("pl.player", () => {
    expect(pl.player(1)).toBe("1 gracz");
    expect(pl.player(2)).toBe("2 gracze");
    expect(pl.player(5)).toBe("5 graczy");
  });

  it("pl.point", () => {
    expect(pl.point(1)).toBe("1 punkt");
    expect(pl.point(3)).toBe("3 punkty");
    expect(pl.point(10)).toBe("10 punktów");
  });

  it("pl.win", () => {
    expect(pl.win(1)).toBe("1 wygrana");
    expect(pl.win(4)).toBe("4 wygrane");
    expect(pl.win(5)).toBe("5 wygranych");
  });

  it("pl.loss", () => {
    expect(pl.loss(1)).toBe("1 przegrana");
    expect(pl.loss(2)).toBe("2 przegrane");
    expect(pl.loss(6)).toBe("6 przegranych");
  });

  it("pl.participant", () => {
    expect(pl.participant(1)).toBe("1 uczestnik");
    expect(pl.participant(3)).toBe("3 uczestnicy");
    expect(pl.participant(5)).toBe("5 uczestników");
  });

  it("pl.tournament", () => {
    expect(pl.tournament(1)).toBe("1 turniej");
    expect(pl.tournament(2)).toBe("2 turnieje");
    expect(pl.tournament(7)).toBe("7 turniejów");
  });

  it("pl.round", () => {
    expect(pl.round(1)).toBe("1 runda");
    expect(pl.round(3)).toBe("3 rundy");
    expect(pl.round(8)).toBe("8 rund");
  });

  it("pl.error", () => {
    expect(pl.error(1)).toBe("1 błąd");
    expect(pl.error(2)).toBe("2 błędy");
    expect(pl.error(5)).toBe("5 błędów");
  });

  it("pl.competitor", () => {
    expect(pl.competitor(1)).toBe("1 zawodnik");
    expect(pl.competitor(4)).toBe("4 zawodnicy");
    expect(pl.competitor(10)).toBe("10 zawodników");
  });

  it("pl.ranking", () => {
    expect(pl.ranking(1)).toBe("1 ranking");
    expect(pl.ranking(2)).toBe("2 rankingi");
    expect(pl.ranking(5)).toBe("5 rankingów");
  });
});

describe("adj adjective helpers", () => {
  it("adj.new", () => {
    expect(adj.new(1)).toBe("nowy");
    expect(adj.new(2)).toBe("nowe");
    expect(adj.new(5)).toBe("nowych");
    expect(adj.new(22)).toBe("nowe");
    expect(adj.new(12)).toBe("nowych");
  });
});
