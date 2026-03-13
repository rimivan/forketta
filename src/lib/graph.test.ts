import { describe, expect, it } from "vitest";
import { buildCommitGraph } from "./graph";
import type { CommitRecord } from "../types";

function commit(
  oid: string,
  parents: string[],
  subject = oid,
): CommitRecord {
  return {
    oid,
    shortOid: oid,
    parents,
    refs: [],
    authorName: "Author",
    authorEmail: "author@example.com",
    authoredAt: "2026-03-13T10:00:00Z",
    subject,
  };
}

describe("buildCommitGraph", () => {
  it("keeps a linear history on a single lane", () => {
    const rows = buildCommitGraph([
      commit("a", ["b"]),
      commit("b", ["c"]),
      commit("c", []),
    ]);

    expect(rows.map((row) => row.lane)).toEqual([0, 0, 0]);
    expect(rows[rows.length - 1]?.parents).toHaveLength(0);
  });

  it("allocates a second lane for side branches and closes it on merge", () => {
    const rows = buildCommitGraph([
      commit("m", ["l", "r"], "merge"),
      commit("l", ["b"], "left"),
      commit("r", ["b"], "right"),
      commit("b", [], "base"),
    ]);

    expect(rows.map((row) => row.lane)).toEqual([0, 0, 1, 0]);
    expect(rows[0].parents.map((segment) => segment.to)).toEqual([0, 1]);
    expect(rows[2].parents[0].to).toBe(0);
  });
});
