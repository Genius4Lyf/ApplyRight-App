import i18n from '../i18n';

// Maps a failed "start a CV" request (build-start / tailor-start / draft create) to a
// specific, translated toast message, instead of collapsing every failure into one
// generic string. Callers still log the error themselves (with status + body) right
// before showing this — this only decides WHAT to say.
export function startCvErrorMessage(error) {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (status === 429) return i18n.t('errors.startCv.rateLimited');
  if (status === 401) return i18n.t('errors.startCv.sessionExpired');
  if (status === 503) return i18n.t('errors.startCv.aiUnavailable');
  if ((status === 400 || status === 500) && serverMessage) return serverMessage;
  return i18n.t('errors.startCv.generic');
}
