import { useNavigate } from 'react-router-dom';
import { AlertCircle, PlayCircle, Sparkles } from 'lucide-react';
import useCredits from '../hooks/useCredits';

// Wrap a Generate / Analyze button. If the user has enough credits, renders
// the children unchanged. Otherwise renders an inline amber banner above a
// disabled clone of the children, so the user sees the action they wanted
// plus a clear "why it's blocked + how to unblock" explanation.
//
// Usage:
//   <CreditGate cost={CREDIT_COSTS.FIT_ANALYSIS}>
//     <button onClick={handleAnalyze} className="...">Analyze</button>
//   </CreditGate>
//
// The post-hoc "Insufficient Credits" modal in Dashboard.jsx remains as a
// safety net for cases where credits change between preflight and click
// (e.g. a parallel tab spent some).
const CreditGate = ({ cost, children, className = '' }) => {
  const navigate = useNavigate();
  const { credits, hasEnough, shortBy } = useCredits();

  if (hasEnough(cost)) {
    return children;
  }

  const short = shortBy(cost);
  // While credits are still loading (null), don't render a misleading banner —
  // just disable the children and skip the warning copy. Users without a
  // signed-in user object would see this; rare in practice.
  const isLoading = credits == null;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {!isLoading && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 leading-tight">
                You need {short} more credit{short === 1 ? '' : 's'} to run this
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                This action costs {cost} credits — you have {credits}.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/credits')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
              Watch ad
            </button>
            <button
              type="button"
              onClick={() => navigate('/credits')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Get credits
            </button>
          </div>
        </div>
      )}

      {/* Render the original button(s) but force-disable. Pointer events off so
          their existing onClick can't fire even if the disabled prop is
          ignored (e.g. a div pretending to be a button). */}
      <div className="opacity-50 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
    </div>
  );
};

export default CreditGate;
