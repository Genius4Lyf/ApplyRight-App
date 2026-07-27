import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

// Shown once, the first time a user reaches checkout from ANY purchase surface
// (CreditStore or Upgrade) — explains the personal Flutterwave settlement account
// before the user sees it unexplained on their bank statement/SMS. Remembered via
// paymentTrust.js so it never appears again once confirmed or dismissed.
const PaymentTrustModal = ({ open, onConfirm, onClose }) => {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6 text-slate-900 dark:text-slate-100" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t('billing.common.trustModalTitle')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              <Trans
                i18nKey="billing.common.trustModalBody"
                components={{
                  mail: (
                    <a
                      href="mailto:careers@applyright.com.ng"
                      className="underline hover:no-underline"
                    />
                  ),
                }}
              />
            </p>

            <button
              onClick={onConfirm}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              {t('billing.common.trustModalContinue')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentTrustModal;
