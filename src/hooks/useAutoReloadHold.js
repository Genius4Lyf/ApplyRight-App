import { useEffect } from 'react';
import { holdAutoReload } from '../lib/appUpdate';

/**
 * Block the automatic post-deploy reload while this component is mounted and `active`.
 *
 * For work a reload would destroy that no form guard covers — the live voice interview
 * above all, where minutes are reserved server-side when the session is minted, so a
 * reload mid-call spends the user's paid minutes on nothing.
 *
 * The hold releases on unmount even if `active` never goes false, so a crash or a fast
 * route change cannot leave the app permanently unable to update itself.
 *
 * @param {string} reason — shown in autoReloadBlockers(); name the WORK, not the page.
 * @param {boolean} active
 */
export default function useAutoReloadHold(reason, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    return holdAutoReload(reason);
  }, [reason, active]);
}
