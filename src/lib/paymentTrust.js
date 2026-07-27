const PAYMENT_NOTICE_KEY = 'applyright-payment-notice-seen';

export const hasSeenPaymentNotice = () => {
  try {
    return localStorage.getItem(PAYMENT_NOTICE_KEY) === '1';
  } catch {
    return false; // private mode / storage unavailable — show it every time, safest default
  }
};

export const markPaymentNoticeSeen = () => {
  try {
    localStorage.setItem(PAYMENT_NOTICE_KEY, '1');
  } catch {
    // ignore persistence failures
  }
};
