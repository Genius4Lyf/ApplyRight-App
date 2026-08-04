import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// The sign-out confirmation dialog — a single shared implementation so every place
// sign-out can be triggered (the top navbar's account menu, the Aria Studio sidebar's
// profile popover) shows the exact same confirm, rather than each mount owning its own
// copy. Each caller owns its own `open` boolean; this component is purely controlled.
const SignOutConfirm = ({ open, onCancel, onConfirm }) => {
  const { t } = useTranslation();
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-6 transform transition-all scale-100">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
            <LogOut className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            {t('nav.logout.title')}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{t('nav.logout.body')}</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-red-200 dark:shadow-none"
            >
              {t('nav.logout.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SignOutConfirm;
