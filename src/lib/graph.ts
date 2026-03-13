import type { CommitRecord } from "../types";

export interface GraphSegment {
  id: string;
  from: number;
  to: number;
}

export interface GraphRow {
  commit: CommitRecord;
  lane: number;
  width: number;
  topLine: boolean;
  carries: GraphSegment[];
  parents: Array<GraphSegment & { primary: boolean }>;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    output.push(value);
  }

  return output;
}

export function buildCommitGraph(commits: CommitRecord[]): GraphRow[] {
  const lanes: string[] = [];

  return commits.map((commit) => {
    let lane = lanes.indexOf(commit.oid);
    if (lane === -1) {
      lanes.unshift(commit.oid);
      lane = 0;
    }

    const before = [...lanes];
    const parents = dedupe(commit.parents);

    if (parents.length === 0) {
      lanes.splice(lane, 1);
    } else {
      lanes[lane] = parents[0];

      parents.slice(1).forEach((parent, index) => {
        if (!lanes.includes(parent)) {
          lanes.splice(lane + index + 1, 0, parent);
        }
      });
    }

    const after = dedupe(lanes);
    lanes.splice(0, lanes.length, ...after);

    const carries: GraphSegment[] = [];
    for (const id of dedupe([...before, ...after])) {
      if (!id || id === commit.oid || parents.includes(id)) {
        continue;
      }

      const from = before.indexOf(id);
      const to = after.indexOf(id);
      if (from !== -1 && to !== -1) {
        carries.push({ id, from, to });
      }
    }

    const parentSegments = parents.flatMap((id, index) => {
      const to = after.indexOf(id);
      if (to === -1) {
        return [];
      }

      return [
        {
          id,
          from: lane,
          to,
          primary: index === 0,
        },
      ];
    });

    return {
      commit,
      lane,
      width: Math.max(before.length, after.length, lane + 1),
      topLine: before[lane] === commit.oid,
      carries,
      parents: parentSegments,
    };
  });
}

export function graphColorIndex(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % 6;
}
