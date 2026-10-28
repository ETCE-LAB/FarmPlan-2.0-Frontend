import { useFarmStore } from '@farm/store/useFarmStore';
import { showToast } from '@farm/store/useUiStore';

export function mutateWithUndo(mutate: () => void, message: string, undoLabel: string) {
  const snapshot = useFarmStore.getState().snapshot();
  mutate();
  showToast({
    message,
    tone: 'info',
    action: { label: undoLabel, onClick: () => useFarmStore.getState().restore(snapshot) },
  });
}
