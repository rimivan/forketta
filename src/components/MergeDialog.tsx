import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
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
  const { t } = useI18n();

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("merge.title")}</DialogTitle>
          <DialogDescription>
            {t("merge.description", { sourceBranch, targetBranch })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy}>
            {busy ? t("merge.progress") : t("merge.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
