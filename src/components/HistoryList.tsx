import { buildCommitGraph, graphColorIndex } from "../lib/graph";
import { classNames, formatRelativeTime } from "../lib/format";
import type { CommitRecord } from "../types";

interface HistoryListProps {
  commits: CommitRecord[];
  selectedCommit: string | null;
  onSelectCommit: (oid: string) => void;
}

const laneWidth = 16;

function refTone(reference: string): "head" | "remote" | "tag" | "local" {
  if (reference.startsWith("HEAD")) {
    return "head";
  }
  if (reference.startsWith("tag:")) {
    return "tag";
  }
  if (reference.includes("/")) {
    return "remote";
  }
  return "local";
}

export function HistoryList({
  commits,
  selectedCommit,
  onSelectCommit,
}: HistoryListProps) {
  const graphRows = buildCommitGraph(commits);
  const maxWidth = Math.max(1, ...graphRows.map((row) => row.width));

  return (
    <section className="history panel">
      <div className="section-heading">
        <h2>History</h2>
        <span>{commits.length} commit caricati</span>
      </div>

      <div className="history-list">
        {graphRows.map((row) => {
          const width = maxWidth * laneWidth;
          const nodeX = row.lane * laneWidth + laneWidth / 2;
          return (
            <button
              key={row.commit.oid}
              className={classNames(
                "history-row",
                row.commit.oid === selectedCommit && "history-row-active",
              )}
              type="button"
              onClick={() => onSelectCommit(row.commit.oid)}
            >
              <svg
                className="graph-canvas"
                viewBox={`0 0 ${width} 28`}
                style={{ width }}
                aria-hidden="true"
              >
                {row.topLine ? (
                  <line
                    x1={nodeX}
                    x2={nodeX}
                    y1={0}
                    y2={14}
                    style={{
                      stroke: `var(--graph-${graphColorIndex(row.commit.oid)})`,
                    }}
                  />
                ) : null}

                {row.carries.map((segment) => (
                  <line
                    key={`carry-${segment.id}`}
                    x1={segment.from * laneWidth + laneWidth / 2}
                    x2={segment.to * laneWidth + laneWidth / 2}
                    y1={0}
                    y2={28}
                    style={{
                      stroke: `var(--graph-${graphColorIndex(segment.id)})`,
                    }}
                  />
                ))}

                {row.parents.map((segment) => (
                  <line
                    key={`parent-${segment.id}`}
                    x1={nodeX}
                    x2={segment.to * laneWidth + laneWidth / 2}
                    y1={14}
                    y2={28}
                    style={{
                      stroke: `var(--graph-${graphColorIndex(segment.id)})`,
                      strokeWidth: segment.primary ? 2.6 : 1.8,
                    }}
                  />
                ))}

                <circle
                  cx={nodeX}
                  cy={14}
                  r={4.8}
                  style={{
                    fill: `var(--graph-${graphColorIndex(row.commit.oid)})`,
                  }}
                />
              </svg>

              <div className="history-content">
                <div className="history-topline">
                  <strong>{row.commit.subject}</strong>
                  <span>{formatRelativeTime(row.commit.authoredAt)}</span>
                </div>

                <div className="history-meta">
                  <span>{row.commit.shortOid}</span>
                  <span>{row.commit.authorName}</span>
                  {row.commit.refs.map((reference) => (
                    <span
                      key={`${row.commit.oid}-${reference}`}
                      className={`ref-badge ${refTone(reference)}`}
                    >
                      {reference}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
