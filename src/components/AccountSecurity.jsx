import React, { useState } from 'react';
import { Mail, Lock, Download, Save } from 'lucide-react';
import { toast } from 'sonner';
import UserService from '../services/user.service';

/**
 * Account security (Phase 5 of the Profile → Account Hub): change email, change
 * password, export data. Self-contained — owns its own form state so it doesn't
 * touch the page-level profile form / dirty-save mechanism.
 */
const AccountSecurity = ({ currentEmail, onEmailUpdated }) => {
  // Email form
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const [exporting, setExporting] = useState(false);

  const submitEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || !emailPassword) return;
    setEmailSaving(true);
    try {
      const updated = await UserService.changeEmail({
        currentPassword: emailPassword,
        newEmail,
      });
      toast.success('Email updated successfully');
      setNewEmail('');
      setEmailPassword('');
      onEmailUpdated?.(updated?.email || newEmail);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update email.');
    } finally {
      setEmailSaving(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      await UserService.changePassword({ currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await UserService.exportData();
      toast.success('Your data is downloading');
    } catch (err) {
      console.error('Export failed', err);
      toast.error('Could not export your data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const inputClass =
    'w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500';

  return (
    <div className="space-y-6">
      {/* Change email */}
      <form
        onSubmit={submitEmail}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
      >
        <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          Email address
        </h3>
        {currentEmail && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
            Current:{' '}
            <span className="font-medium text-slate-600 dark:text-slate-300">{currentEmail}</span>
          </p>
        )}
        <div className="space-y-3">
          <div>
            <label
              htmlFor="newEmail"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
            >
              New email
            </label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="emailPassword"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
            >
              Confirm with password
            </label>
            <input
              id="emailPassword"
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              placeholder="Your current password"
              autoComplete="current-password"
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={emailSaving || !newEmail || !emailPassword}
            className={`btn-primary px-6 py-2 flex items-center justify-center ${emailSaving || !newEmail || !emailPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {emailSaving ? (
              'Updating...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Update email
              </>
            )}
          </button>
        </div>
      </form>

      {/* Change password */}
      <form
        onSubmit={submitPassword}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
      >
        <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          Password
        </h3>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
            >
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="newPassword"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
            >
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={pwSaving || !currentPassword || !newPassword}
            className={`btn-primary px-6 py-2 flex items-center justify-center ${pwSaving || !currentPassword || !newPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {pwSaving ? (
              'Updating...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Update password
              </>
            )}
          </button>
        </div>
      </form>

      {/* Export data */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
          <Download className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          Export your data
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Download a JSON copy of your profile, CVs, applications and transactions.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Preparing...' : 'Download my data'}
        </button>
      </div>
    </div>
  );
};

export default AccountSecurity;
