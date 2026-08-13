import React from 'react';
import { Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAccountWallet } from '../hooks/useAccountWallet';

// Compact wallet control for focused workspaces. The return route is stored before
// leaving so hosted checkout can bring the user back to the exact CV step or Studio.
const WorkspaceCreditBalance = ({ className = '', onBeforeNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('token');
  const { displayCredits } = useAccountWallet(isAuthenticated);
  const balance = displayCredits ?? 0;

  const openCreditStore = async () => {
    try {
      await onBeforeNavigate?.();
    } catch {
      // Saving is best-effort; the return route must still remain available.
    }
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    try {
      localStorage.setItem('arPostCheckout', returnTo);
      localStorage.setItem('arCheckoutIntent', 'credits');
    } catch {
      // Router state still preserves the return destination for this visit.
    }
    navigate('/credits', { state: { returnTo } });
  };

  return (
    <button
      type="button"
      onClick={openCreditStore}
      aria-label={`${balance} A.I credits. Get more credits`}
      title={`${balance} A.I credits — get more credits`}
      className={`group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${className}`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white text-[11px] font-bold tabular-nums text-slate-800 shadow-sm transition-colors group-hover:border-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:group-hover:border-white">
        {balance > 999 ? '999+' : balance}
      </span>
      <span className="absolute -bottom-0.5 -right-1 grid h-[17px] w-[17px] place-items-center rounded-full bg-white text-slate-950 shadow-sm transition-transform group-hover:scale-110">
        <Plus className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    </button>
  );
};

export default WorkspaceCreditBalance;
