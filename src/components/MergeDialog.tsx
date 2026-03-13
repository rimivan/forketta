interface MergeDialogProps {
  sourceBranch: string;
  targetBranch: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function MergeDialog({
  sourceBranch,
  targetBranch,
  busy,
  onCancel,
  onConfirm,
}: MergeDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog panel" role="dialog" aria-modal="true">
        <div className="section-heading">
          <h2>Merge branch</h2>
          <span>drag & drop workflow</span>
        </div>

        <p>
          Il branch <strong>{sourceBranch}</strong> verrà mergiato dentro{" "}
          <strong>{targetBranch}</strong>. Se necessario, Forketta effettuerà
          prima il checkout del target branch.
        </p>

        <div className="dialog-actions">
          <button type="button" onClick={onCancel} disabled={busy}>
            Annulla
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Merge..." : "Conferma merge"}
          </button>
        </div>
      </div>
    </div>
  );
}
