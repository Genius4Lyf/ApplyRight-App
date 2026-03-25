import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/Admin/AdminLayout';
import { AdReportPreview } from '../../components/Admin/AdReportTemplate';
import { AD_TEMPLATES, compactNumber } from '../../components/Admin/adReportTemplates';
import { Check, Download } from 'lucide-react';
import api from '../../services/api';
import CustomSelect from '../../components/Admin/CustomSelect';

const AdminReportStudio = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCredits: 0,
    totalResumes: 0,
    totalApplications: 0,
    newUsersLastMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('social-proof');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Period filters
  const [viewType, setViewType] = useState('daily');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { value: y, label: y.toString() };
  });

  const months = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const query = `period=${viewType}&year=${selectedYear}&month=${selectedMonth}`;
        const response = await api.get(`/admin/stats?${query}`, config);
        setStats(response.data.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [viewType, selectedYear, selectedMonth]);

  const activeTemplate =
    AD_TEMPLATES.find((t) => t.id === selectedTemplate) || AD_TEMPLATES[0];

  const activeMonthLabel = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('en-NG', {
    month: 'long',
  });

  const reportContext = {
    periodLabel:
      viewType === 'monthly'
        ? `${selectedYear} yearly summary`
        : `${activeMonthLabel} ${selectedYear}`,
    scopeLabel:
      viewType === 'monthly'
        ? 'Monthly totals across the selected year'
        : 'Daily totals across the selected month',
    generatedOn: new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date()),
  };

  const handleDownload = async () => {
    setGeneratingReport(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post(
        '/admin/report-screenshot',
        {
          templateId: selectedTemplate,
          stats,
          context: reportContext,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `applyright-ad-${selectedTemplate}-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate report', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ad Reports</h1>
          <p className="text-slate-500">
            Pick a design, preview it, and download as PNG.
          </p>
        </div>

        {/* Period filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewType('monthly')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewType === 'monthly'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setViewType('daily')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewType === 'daily'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Monthly
            </button>
          </div>
          <div className="w-24">
            <CustomSelect value={selectedYear} options={years} onChange={setSelectedYear} />
          </div>
          {viewType === 'daily' && (
            <div className="w-24">
              <CustomSelect value={selectedMonth} options={months} onChange={setSelectedMonth} />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8">
          {/* Left: template selector */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Choose a design
            </h3>
            <div className="space-y-4">
              {AD_TEMPLATES.map((template) => {
                const isActive = template.id === selectedTemplate;
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      isActive
                        ? 'border-primary bg-primary/[0.03] shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isActive ? (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">{template.name}</div>
                          <div className="text-sm text-slate-500">{template.description}</div>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                        isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {template.focus}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Data snapshot */}
            <div className="mt-6 bg-white rounded-xl border border-slate-200 p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Data in this export
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Users', value: compactNumber(stats.totalUsers) },
                  { label: 'Resumes', value: compactNumber(stats.totalResumes) },
                  { label: 'Applications', value: compactNumber(stats.totalApplications) },
                  { label: 'Searches', value: compactNumber(0) },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-lg px-3 py-2.5">
                    <div className="text-lg font-bold text-slate-900">{item.value}</div>
                    <div className="text-xs text-slate-500">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Period: {reportContext.periodLabel}
              </div>
            </div>
          </div>

          {/* Right: preview + download */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Preview
              </h3>
              <button
                onClick={handleDownload}
                disabled={generatingReport}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {generatingReport ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {generatingReport ? 'Generating...' : 'Download PNG'}
              </button>
            </div>

            <div className="bg-slate-100 rounded-xl border border-slate-200 p-6 flex justify-center">
              <AdReportPreview
                stats={stats}
                context={reportContext}
                templateId={selectedTemplate}
                size={480}
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>1080 x 1080 px &middot; 3x resolution</span>
              <span>{reportContext.generatedOn}</span>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminReportStudio;
