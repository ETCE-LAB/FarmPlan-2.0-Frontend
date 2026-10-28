import { useEffect, useRef } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useUiStore } from '@farm/store/useUiStore';
import { Button } from '@farm/components/ui/Button';

export function ConfirmDialogHost() {
  const request = useUiStore((s) => s.confirmRequest);
  const resolveConfirm = useUiStore((s) => s.resolveConfirm);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (request && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!request && dialog.open) dialog.close();
  }, [request]);

  const handleClose = () => {
    if (useUiStore.getState().confirmRequest) resolveConfirm(false);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-md border border-line bg-surface p-6 text-ink shadow-xl backdrop:bg-black/50"
    >
      {request && (
        <>
          <div className="flex items-start gap-3">
            {request.tone === 'danger' && (
              <TriangleAlert size={22} aria-hidden className="text-danger-fg shrink-0 mt-0.5" />
            )}
            <div>
              <h2 id="confirm-dialog-title" className="text-base font-bold">
                {request.title}
              </h2>
              <p id="confirm-dialog-message" className="mt-1 text-sm text-ink-soft">
                {request.message}
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" size="md" data-autofocus onClick={() => resolveConfirm(false)}>
              {request.cancelLabel}
            </Button>
            <Button
              variant={request.tone === 'danger' ? 'dangerSolid' : 'primary'}
              size="md"
              onClick={() => resolveConfirm(true)}
            >
              {request.confirmLabel}
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
