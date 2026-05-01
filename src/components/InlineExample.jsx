import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown } from 'lucide-react';

/**
 * Detect a coarse role family from the user's target job title (or any
 * provided string). Used to pick a relevant example bullet without making
 * the user choose from a dropdown. Falls back to a generic role family.
 *
 * Keywords are checked in priority order — the first hit wins.
 */
export const detectRoleFamily = (targetTitle = '', fallbackTitle = '') => {
  const text = `${targetTitle} ${fallbackTitle}`.toLowerCase();
  if (!text.trim()) return 'generic';

  const matchers = [
    { family: 'engineering', re: /(software|engineer|developer|backend|frontend|fullstack|devops|sre|architect|programmer|coder)/ },
    { family: 'data', re: /(data scientist|data analyst|machine learning|ml engineer|analytics|data engineer|bi analyst)/ },
    { family: 'product', re: /(product manager|product owner|pm\b|product lead)/ },
    { family: 'design', re: /(designer|ux|ui|design lead|art director|creative)/ },
    { family: 'marketing', re: /(marketing|growth|seo|content|social media|brand)/ },
    { family: 'sales', re: /(sales|account executive|business development|bd\b|account manager)/ },
    { family: 'operations', re: /(operations|ops|logistics|supply chain|project manager)/ },
    { family: 'finance', re: /(finance|accountant|financial analyst|treasury|controller)/ },
    { family: 'hr', re: /(human resources|recruit|hr\b|talent|people operations)/ },
    { family: 'customer', re: /(customer success|customer support|account manager|client services)/ },
  ];

  for (const m of matchers) {
    if (m.re.test(text)) return m.family;
  }
  return 'generic';
};

/**
 * Static example bank — short, realistic bullets organized by role family
 * and example "kind" (work bullet vs project description vs summary).
 *
 * Goal: show users what "good" looks like with concrete numbers, action verbs,
 * and visible impact — without giving them text to copy verbatim.
 */
const EXAMPLES = {
  bullet: {
    engineering: [
      'Built a real-time notification service in Node.js + Redis, cutting end-to-end delivery from 4s to 280ms across 12K daily active users.',
      'Led the migration of 8 services from EC2 to Kubernetes, reducing monthly infra spend by 38% and deploy time from 45 min to 6 min.',
      'Refactored the payment retry logic to fix a duplicate-charge bug affecting ~2% of transactions; recovered ~$140K in disputed revenue per quarter.',
    ],
    data: [
      'Built a churn prediction model in Python (scikit-learn) achieving 0.87 AUC; rolled into product CRM, lifting at-risk save rate from 12% to 27%.',
      'Designed an experimentation framework adopted by 6 product teams; reduced time-to-test launch from 2 weeks to 3 days.',
      'Replaced a 4-hour daily ETL with a streaming Kafka pipeline; cut data latency to under 5 minutes for 22 downstream dashboards.',
    ],
    product: [
      'Launched a self-serve onboarding flow that lifted day-7 activation from 31% to 49%, contributing $1.8M in incremental ARR over two quarters.',
      'Killed two underperforming product lines after 6 weeks of usage analysis; redirected the team to ship a single feature that grew DAU 22%.',
      'Ran weekly customer interviews with 40+ enterprise users; insights drove a roadmap pivot that closed two $250K+ deals.',
    ],
    design: [
      'Redesigned the checkout flow based on session-replay analysis; cut cart abandonment from 38% to 24% within 6 weeks.',
      'Built a design system used across 4 product surfaces and 35 components; reduced new-screen design time from 3 days to 8 hours.',
      'Led usability testing with 18 participants per quarter; findings shaped the dashboard rebuild that lifted CSAT from 6.8 to 8.2.',
    ],
    marketing: [
      'Built a content engine of 40+ SEO articles in 6 months; grew organic monthly visitors from 8K to 64K and contributed 22% of new signups.',
      'Owned paid social spend of $80K/month across Meta and TikTok; brought CAC down 31% while doubling lead volume.',
      'Launched a webinar series with 6 events and 2,400+ registrants; sourced $480K in pipeline within the first quarter.',
    ],
    sales: [
      'Closed $1.4M in net-new ARR in FY24, 142% of quota; ranked #2 of 14 reps in the segment.',
      'Built and ran a 3-stage outbound cadence; lifted reply rate from 4% to 11% and booked 38 qualified meetings per quarter.',
      'Owned the migration of 22 legacy customers to the new platform; retained 97% with $620K in expanded contracts.',
    ],
    operations: [
      'Mapped and rebuilt the order-fulfillment process across 3 warehouses; cut average fulfillment time from 38 hours to 14 hours.',
      'Negotiated 4 new vendor contracts saving $220K annually; introduced a quarterly review cadence to keep terms competitive.',
      'Led a cross-functional Kaizen sprint that cut returns rate from 7.4% to 4.1% in two quarters.',
    ],
    finance: [
      'Built the rolling 18-month forecast model used in 3 board reviews; identified a $1.2M cost-saving opportunity in vendor consolidation.',
      'Automated the monthly close process with Power Query and Python; reduced close from 9 days to 4 days.',
      'Managed cash positioning across 6 currencies and 12 accounts; reduced FX losses by 28% YoY.',
    ],
    hr: [
      'Rebuilt the engineering interview loop; raised offer-acceptance rate from 51% to 78% over two hiring cycles.',
      'Rolled out a peer-feedback program to 240 employees; engagement score on "I get useful feedback" rose from 6.1 to 7.9.',
      'Closed 22 senior hires in a single quarter, 30% of them from underrepresented groups.',
    ],
    customer: [
      'Owned a portfolio of 38 enterprise accounts ($14M ARR); achieved 119% net revenue retention through targeted expansion plays.',
      'Reduced average ticket resolution time from 22h to 9h by rebuilding the macros library and routing logic.',
      'Drove 14 customer reference calls and 6 case studies, directly cited in $2.3M of closed-won deals.',
    ],
    generic: [
      'Led a cross-functional initiative across 3 teams that delivered $X in measurable impact within Y months.',
      'Built and shipped Z, used by N people, that reduced [metric] from A to B.',
      'Owned [responsibility] end-to-end; surfaced findings that changed [decision] and saved [X hours / $Y].',
    ],
  },
  project: {
    engineering: [
      'A weekend project: a Discord bot in Python that summarizes long threads using OpenAI; ~600 users across 12 servers.',
      'Open-source: a Tailwind component library (200+ stars on GitHub) used in two production apps.',
    ],
    data: [
      'Kaggle: top 8% solution to the "store sales forecasting" challenge using LightGBM and feature engineering on holiday/promo signals.',
      'Personal: built a dashboard tracking my city\'s public transit reliability — 18 months of GTFS data, deployed on Streamlit.',
    ],
    generic: [
      'A short, descriptive name + 1-2 lines on what it does, who uses it, and the most concrete outcome you can name.',
    ],
  },
  summary: {
    engineering: [
      'Senior engineer with 7 years building scalable backend systems in Go and Python. Led migrations affecting 30+ services and mentored a team of 5. Looking to ship infrastructure that scales gracefully and reduces on-call pain.',
    ],
    product: [
      'Product manager with 5 years shipping B2B SaaS to mid-market customers. Took an internal tool from 0 to $4M ARR through three pricing iterations and a self-serve motion. Strongest at turning customer pain into shipped roadmap.',
    ],
    generic: [
      'A 2-3 sentence summary of who you are professionally, what you\'ve done that\'s most relevant to the role, and what you\'re looking for next. Specific > generic.',
    ],
  },
};

/**
 * InlineExample
 *
 * A small "Show example" reveal panel that displays a relevant sample
 * for the user's target role. Click to expand, click again to hide.
 *
 * Props:
 *   kind     - "bullet" | "project" | "summary"
 *   role     - role family string (or pass `targetTitle` to auto-detect)
 *   targetTitle - if provided, role is auto-detected via detectRoleFamily
 *   label    - optional override for the toggle text
 */
const InlineExample = ({ kind = 'bullet', role, targetTitle, label }) => {
  const [open, setOpen] = useState(false);
  const family = role || detectRoleFamily(targetTitle || '');
  const bank = EXAMPLES[kind] || {};
  const candidates = bank[family] || bank.generic || [];

  if (candidates.length === 0) return null;

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
      >
        <Sparkles className="w-3 h-3" />
        {label || (open ? 'Hide example' : 'Show me an example')}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex"
        >
          <ChevronDown className="w-3 h-3" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="example"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-3">
              {candidates.slice(0, 2).map((ex, i) => (
                <p
                  key={i}
                  className="text-xs text-slate-700 italic leading-relaxed border-l-2 border-indigo-300 pl-2"
                >
                  "{ex}"
                </p>
              ))}
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 mt-2">
                These are examples for inspiration — write your own truthfully.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InlineExample;
