import React from 'react';
import { useTranslation } from 'react-i18next';
import { FilePlus2, Mail, MessageSquare } from 'lucide-react';
import AriaCard from './AriaCard';
import FitScoreCard from '../FitScoreCard';
import GenerationModelRow from '../cv/GenerationModelRow';
import CreditGate from '../CreditGate';
import { ReadyChip, GhostButton, InkButton } from '../dashboard/ToolkitButtons';
import { CREDIT_COSTS } from '../../lib/credits';
import { costForActionTier, tierOf } from '../../lib/models';
import { hasInterviewPrep } from '../../utils/interviewPrep';
import { decodeEntities } from '../../lib/decodeEntities';

// One row of the "what next" list. The three actions differ in what they produce, not in
// how they are offered, so they share a shape rather than three near-identical blocks.
//
// `Icon` is used only via <Icon /> in JSX; this eslint config lacks jsx-uses-vars so it
// reads as unused — same false positive AriaCard suppresses for `motion`.
// eslint-disable-next-line no-unused-vars
const ActionRow = ({ icon: Icon, title, body, children, extra }) => (
  <div className="border-t border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
      <Icon
        className="mt-0.5 h-[18px] w-[18px] shrink-0 self-start text-slate-400"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-slate-800 dark:text-slate-200">{title}</p>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          {body}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
    {extra}
  </div>
);

// The end of a prep session: what the analysis found, and the three things worth doing
// about it.
//
// The verdict is FitScoreCard — the same component the home page used before this flow
// moved into the Studio, not a chat-shaped retelling of it. Someone who ran an analysis
// last month should recognise this screen.
//
// The three actions are deliberately the only three. A job analysis suggests a hundred
// possible next steps and offering all of them is how a result becomes a menu nobody
// reads; these are the ones that produce something you can send or use.
const PrepResultsCard = ({
  application,
  jobTitle,
  company,
  onBuildCv,
  onCoverLetter,
  onViewCoverLetter,
  onInterviewPrep,
  onViewInterviewPrep,
  buildingCv,
  generatingCoverLetter,
  generatingPrep,
  coverLetterFreeRemaining = 0,
  genModelId,
  onGenModel,
  chatTier,
}) => {
  const { t } = useTranslation();
  const applicationId = application?.applicationId || application?._id;

  // Priced at the tier of the model actually picked for THIS action, so the chip can't
  // quote Standard while a Pro request goes out — the under-quote that bit the
  // generation pickers before.
  const letterTier = tierOf(genModelId);
  const letterCost =
    costForActionTier('GENERATE_COVER_LETTER', letterTier) ?? CREDIT_COSTS.GENERATE_COVER_LETTER;
  // The free daily letter is a STANDARD letter — the server refuses to spend it on a Pro
  // one, so the chip must not promise it either.
  const letterIsFree = letterTier !== 'flagship' && coverLetterFreeRemaining > 0;

  const prepCost = CREDIT_COSTS.GENERATE_INTERVIEW;
  const prepReady = hasInterviewPrep(application);

  // Scraped titles routinely carry the company already ("… at Starsight Energy Nigeria
  // 2026"), and appending it again produced "… at Starsight Energy Nigeria 2026 at
  // Starsight Energy". Entities are decoded here too: analyses captured before the
  // scraper learned to do it are stored with them intact.
  const role = decodeEntities(jobTitle);
  const employer = decodeEntities(company);
  const namesEmployer = !!employer && role.toLowerCase().includes(employer.toLowerCase());
  const showEmployer = !!employer && !namesEmployer;

  return (
    <AriaCard cardKey="prepresults">
      <div className="w-full min-w-0 space-y-3">
        <FitScoreCard
          fitScore={application?.fitScore}
          fitAnalysis={application?.fitAnalysis}
          actionPlan={application?.actionPlan}
          optimizedFitScore={application?.optimizedFitScore}
          applicationId={applicationId}
        />

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
          <div className="px-4 pb-3 pt-4 sm:px-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.prep.whatNext')}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
              {showEmployer
                ? t('ariaStudio.prep.whatNextBodyCompany', {
                    jobTitle: role,
                    company: employer,
                  })
                : t('ariaStudio.prep.whatNextBody', { jobTitle: role })}
            </p>
          </div>

          {/* Build a CV — first, and the only one with no price on it. Starting a build
              costs nothing; the JD is carried over so the new session opens already
              knowing what it is aimed at. */}
          <ActionRow
            icon={FilePlus2}
            title={t('ariaStudio.prep.buildCvTitle')}
            body={t('ariaStudio.prep.buildCvBody')}
          >
            <button
              type="button"
              onClick={onBuildCv}
              disabled={buildingCv}
              className="btn-primary px-3.5 py-2 text-[13px] disabled:opacity-60"
            >
              {buildingCv ? t('ariaStudio.prep.opening') : t('ariaStudio.prep.buildCvCta')}
            </button>
          </ActionRow>

          <ActionRow
            icon={Mail}
            title={t('ariaStudio.prep.coverLetterTitle')}
            body={t('ariaStudio.prep.coverLetterBody')}
            extra={
              application?.coverLetter ? null : (
                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <GenerationModelRow
                    action="coverLetter"
                    value={genModelId}
                    onSelect={onGenModel}
                    chatTier={chatTier || letterTier}
                    unit="flat"
                  />
                </div>
              )
            }
          >
            {application?.coverLetter ? (
              <>
                <ReadyChip />
                <GhostButton onClick={onViewCoverLetter}>
                  {t('ariaStudio.prep.viewAndDownload')}
                </GhostButton>
              </>
            ) : (
              <CreditGate cost={letterIsFree ? 0 : letterCost}>
                <InkButton
                  onClick={() => onCoverLetter?.(genModelId)}
                  generating={generatingCoverLetter}
                  disabled={generatingCoverLetter}
                  cost={letterCost}
                  freeLabel={letterIsFree ? t('dashboard.toolkit.freeToday') : null}
                />
              </CreditGate>
            )}
          </ActionRow>

          <ActionRow
            icon={MessageSquare}
            title={t('ariaStudio.prep.interviewPrepTitle')}
            body={t('ariaStudio.prep.interviewPrepBody')}
          >
            {prepReady ? (
              <>
                <ReadyChip />
                <GhostButton onClick={onViewInterviewPrep}>{t('ariaStudio.prep.view')}</GhostButton>
              </>
            ) : (
              <CreditGate cost={prepCost}>
                <InkButton
                  onClick={onInterviewPrep}
                  generating={generatingPrep}
                  disabled={generatingPrep}
                  cost={prepCost}
                />
              </CreditGate>
            )}
          </ActionRow>
        </div>
      </div>
    </AriaCard>
  );
};

export default PrepResultsCard;
