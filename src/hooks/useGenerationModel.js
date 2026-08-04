import { useCallback, useState } from 'react';
import { AI_MODELS } from '../lib/models';

const STORAGE_KEY = 'aria.genModel';

// The model used to GENERATE bullets/summary/skills for one action — independent of the
// chat model (useAriaModel). This is a per-USER preference (localStorage), not per-CV:
// "which model writes my best bullets" is a fact about the user's taste, not about a
// particular draft. Never touches cvData.studioModelId or CVService.setModel — those stay
// useAriaModel's job.
export function useGenerationModel(chatModelId) {
  const [storedId, setStoredId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  // A stored id can go stale — an admin can un-expose a model. Trusting it blindly would
  // quote the user one price and let the server silently charge another (it falls back to
  // DEFAULT_MODEL), so validate against the live exposed set on every read.
  const isExposed = storedId && AI_MODELS.models.some((m) => m.id === storedId);
  const genModelId = isExposed ? storedId : chatModelId || AI_MODELS.defaultModel;

  const setGenModelId = useCallback((id) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Safari private mode etc. — state still updates below, just won't persist.
    }
    setStoredId(id);
  }, []);

  return { genModelId, setGenModelId };
}

export default useGenerationModel;
