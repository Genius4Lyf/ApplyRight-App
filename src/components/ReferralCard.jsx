import React, { useEffect, useState } from 'react';
import { Gift, Copy, Check, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';
import UserService from '../services/user.service';

/**
 * Referral card (Phase 2 of the Profile → Account Hub).
 *
 * Surfaces the user's referral code (already minted at signup) plus invites and
 * credits earned, with copy + native-share. The share link points at the Register
 * page's ?ref= param, which pre-fills the code for the invitee.
 */
const ReferralCard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await UserService.getReferralStats();
        if (alive) setStats(data);
      } catch (err) {
        console.error('Failed to load referral stats', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm animate-pulse">
        <div className="h-5 w-40 bg-slate-100 dark:bg-slate-800 rounded mb-4" />
        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3" />
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>
    );
  }

  // No code yet (shouldn't happen — minted at signup/login) → hide rather than
  // render an empty card.
  if (!stats?.referralCode) return null;

  const { referralCode, referralCount, creditsEarned, referralBonus } = stats;
  const inviteLink = `${window.location.origin}/register?ref=${referralCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Invite link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Long-press the code to copy it manually.');
    }
  };

  const share = async () => {
    const shareData = {
      title: 'Join me on ApplyRight',
      text: 'Build an ATS-ready CV and ace your interviews with ApplyRight. Use my link to get started:',
      url: inviteLink,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user dismissed the share sheet — no-op */
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Gift className="w-4 h-4" />
        </div>
        <h3 className="text-md font-bold text-slate-900 dark:text-slate-100">Refer & earn</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        {referralBonus > 0
          ? `Earn ${referralBonus} credits for every friend who signs up with your code.`
          : 'Invite friends and earn credits when they sign up with your code.'}
      </p>

      {/* Code + copy */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 font-mono font-bold tracking-widest text-center text-slate-900 dark:text-slate-100 select-all">
          {referralCode}
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Copy invite link"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary share action */}
      <button
        type="button"
        onClick={share}
        className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors transform active:scale-[0.98]"
      >
        <Share2 className="w-4 h-4" />
        Share invite link
      </button>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-lg font-extrabold text-slate-900 dark:text-slate-100">
            <Users className="w-4 h-4 text-slate-400" />
            {referralCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {referralCount === 1 ? 'Friend joined' : 'Friends joined'}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 p-3 text-center">
          <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
            {creditsEarned}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Credits earned
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralCard;
