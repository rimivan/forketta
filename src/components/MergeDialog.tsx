import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge branch</DialogTitle>
          <DialogDescription>
            Il branch <strong>{sourceBranch}</strong> verrà mergiato dentro{" "}
            <strong>{targetBranch}</strong>. Se necessario, Forketta effettuerà
            prima il checkout del target branch.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Annulla
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy}>
            {busy ? "Merge..." : "Conferma merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
