import { useCallback } from 'react';
import { toast } from 'sonner';
import CVService from '../services/cv.service';

// The Aria model choice for ONE CV. It lives on the draft (`cvData.studioModelId`) —
// per-CV, not per-user — so the same pick follows the CV between the builder's coach
// chat and the Studio, and the backend resolver reads it straight off the draft.
//
// Writes go BOTH ways on purpose: `updateCvData` reflects the choice instantly in the
// UI (and rides along on the next full saveDraft, which is the only path a not-yet-
// created draft has), while `CVService.setModel` persists it immediately and is the
// server-side GATE — an un-exposed model is rejected there, never trusted from here.
// A rejected/failed switch rolls the local value back so the picker can't lie.
export function useAriaModel({ draftId, cvData, updateCvData }) {
  const modelId = cvData?.studioModelId;

  const selectModel = useCallback(
    async (id) => {
      const prev = modelId;
      if (!id || id === prev) return;
      updateCvData?.({ studioModelId: id });
      // Studio listens for this single selection event and shows one consistent model
      // notice regardless of which of its pickers the user used.
      window.dispatchEvent(new CustomEvent('aria:model-selected', { detail: { modelId: id } }));
      // No draft yet ('new'): the first real save carries the whole cvData, this key
      // included — there's nothing to PATCH server-side until then.
      if (!draftId || draftId === 'new') return;
      try {
        await CVService.setModel(draftId, id);
      } catch {
        updateCvData?.({ studioModelId: prev });
        toast.error("Couldn't switch model — try again.");
      }
    },
    [draftId, modelId, updateCvData]
  );

  return { modelId, selectModel };
}

export default useAriaModel;
