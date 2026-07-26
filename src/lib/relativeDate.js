import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import i18n from '../i18n';

// date-fns has no idea about the app's language — every call site has to pass its own
// `locale` option, and it's easy to forget (as five call sites did). Centralising here
// means the fix is applied everywhere by import, not by remembering to pass `locale`.
export function formatRelative(date) {
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: i18n.language === 'fr' ? fr : undefined,
  });
}
