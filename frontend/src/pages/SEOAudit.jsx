import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, CheckCircle, Info, TrendingUp, Clock, Shield, Zap, Eye, Wrench, Loader2, Smartphone, Monitor } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { projectsAPI, seoAuditAPI } from '../lib/api';
import { logError } from '../lib/logger';
import { track, MixpanelEvents } from '../lib/mixpanel';
import { RadialBarChart, RadialBar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';

const SEOAudit = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState('mobile');
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [pagespeedEnabled, setPagespeedEnabled] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectsAPI.getAll();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      logError('Error loading projects:', error);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const status = await seoAuditAPI.getStatus();
      setPagespeedEnabled(!!status.pagespeed_enabled);
    } catch (error) {
      // Silent fail - default to disabled
      setPagespeedEnabled(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    loadStatus();
  }, [loadProjects, loadStatus]);

  const handleRunAudit = async () => {
    if (!selectedProject || !url) {
      alert('Please select a project and enter a URL');
      return;
    }

    setLoading(true);
    try {
      const result = await seoAuditAPI.runAudit(selectedProject, url, strategy);
      setAudit(result);

      track(MixpanelEvents.SEO_AUDIT_COMPLETED, {
        project_id: selectedProject,
        url: result.url,
        overall_score: result.overall_score,
        performance_source: result.performance_source,
        is_wordpress: result.is_wordpress,
        duration_seconds: result.duration_seconds,
        strategy,
        $insert_id: `seo-audit-${result.id}`,
      });

      // Load history after successful audit
      const history = await seoAuditAPI.getAudits(selectedProject);
      setAuditHistory(history);
    } catch (error) {
      alert(error.message || 'Audit failed. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-[#00FF9D]';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score) => {
    if (score >= 90) return 'bg-[#00FF9D]/10 border-[#00FF9D]/30';
    if (score >= 70) return 'bg-yellow-400/10 border-yellow-400/30';
    if (score >= 50) return 'bg-orange-400/10 border-orange-400/30';
    return 'bg-red-400/10 border-red-400/30';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: <AlertCircle className="w-5 h-5 text-red-400" />,
      warning: <Info className="w-5 h-5 text-yellow-400" />,
      info: <CheckCircle className="w-5 h-5 text-blue-400" />
    };
    return icons[severity] || icons.info;
  };

  const categoryIcons = {
    performance: { icon: Zap, color: 'text-purple-400' },
    seo: { icon: TrendingUp, color: 'text-blue-400' },
    security: { icon: Shield, color: 'text-red-400' },
    technical: { icon: Wrench, color: 'text-yellow-400' },
    accessibility: { icon: Eye, color: 'text-green-400' }
  };

  return (
    <div className="space-y-6" data-testid="seo-audit-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">WordPress Health Dashboard</h1>
          <p className="text-muted-foreground mt-1">Comprehensive website analysis in under 60 seconds</p>
        </div>
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs uppercase tracking-wider border ${
            pagespeedEnabled
              ? 'bg-[#00FF9D]/10 border-[#00FF9D]/30 text-[#00FF9D]'
              : 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
          }`}
          data-testid="pagespeed-status-badge"
        >
          <Zap className="w-3.5 h-3.5" />
          {pagespeedEnabled ? 'Lighthouse (PageSpeed) live' : 'Lighthouse not configured — fallback mode'}
        </div>
      </div>

      {/* Audit Form */}
      <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-400">Select Project</label>
            <Select value={selectedProject} onValueChange={setSelectedProject} disabled={loading}>
              <SelectTrigger className="bg-[#080808] border-[#1a1a1a] focus:border-[#00FF9D]">
                <SelectValue placeholder="Choose project" />
              </SelectTrigger>
              <SelectContent className="bg-[#080808] border-[#1a1a1a]">
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id} className="focus:bg-[#1a1a1a]">
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2 text-gray-400">Website URL</label>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-[#080808] border-[#1a1a1a] focus:border-[#00FF9D] text-white placeholder:text-gray-700"
                disabled={loading}
              />
              <Button
                onClick={handleRunAudit}
                disabled={loading}
                className="bg-[#00FF9D] text-black hover:bg-[#00FF9D]/90 font-semibold px-6"
                data-testid="run-audit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Run Audit
                  </>
                )}
              </Button>
            </div>
            {/* Strategy toggle (mobile/desktop) - only meaningful when PageSpeed is enabled */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs uppercase tracking-wider text-gray-500">Lighthouse strategy:</span>
              <button
                type="button"
                onClick={() => setStrategy('mobile')}
                disabled={loading || !pagespeedEnabled}
                className={`flex items-center gap-1 px-3 py-1 text-xs uppercase tracking-wider border transition-colors ${
                  !pagespeedEnabled
                    ? 'border-[#1a1a1a] text-gray-600 opacity-50 cursor-not-allowed'
                    : strategy === 'mobile'
                      ? 'border-[#00FF9D] text-[#00FF9D] bg-[#00FF9D]/10'
                      : 'border-[#1a1a1a] text-gray-500 hover:text-white'
                }`}
                data-testid="strategy-mobile-btn"
              >
                <Smartphone className="w-3 h-3" /> Mobile
              </button>
              <button
                type="button"
                onClick={() => setStrategy('desktop')}
                disabled={loading || !pagespeedEnabled}
                className={`flex items-center gap-1 px-3 py-1 text-xs uppercase tracking-wider border transition-colors ${
                  !pagespeedEnabled
                    ? 'border-[#1a1a1a] text-gray-600 opacity-50 cursor-not-allowed'
                    : strategy === 'desktop'
                      ? 'border-[#00FF9D] text-[#00FF9D] bg-[#00FF9D]/10'
                      : 'border-[#1a1a1a] text-gray-500 hover:text-white'
                }`}
                data-testid="strategy-desktop-btn"
              >
                <Monitor className="w-3 h-3" /> Desktop
              </button>
              {!pagespeedEnabled && (
                <span className="text-[10px] text-gray-600">(Add GOOGLE_PAGESPEED_API_KEY to enable)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Results */}
      {audit && (
        <div className="space-y-6">
          {/* WordPress Detection */}
          {audit.is_wordpress && (
            <div className="bg-[#0A0A0A] border border-[#00FF9D]/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#00FF9D]/10 flex items-center justify-center">
                    <span className="text-2xl">🔌</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#00FF9D]">WordPress Detected</h3>
                    <p className="text-sm text-gray-400">
                      Confidence: {audit.wordpress_confidence}%
                      {audit.wordpress_theme && ` • Theme: ${audit.wordpress_theme}`}
                    </p>
                  </div>
                </div>
                {audit.wordpress_plugins && audit.wordpress_plugins.length > 0 && (
                  <div className="text-sm text-gray-400">
                    {audit.wordpress_plugins.length} plugin(s) detected
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Overall Score - Large Display */}
          <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-lg font-medium mb-4 text-gray-400">Overall Health Score</h2>
              <div className={`text-8xl font-bold ${getScoreColor(audit.overall_score)} mb-2`}>
                {audit.overall_score}
              </div>
              <p className="text-gray-500 text-sm">out of 100</p>
              <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Completed in {audit.duration_seconds}s
                </span>
                <span className="text-gray-700">•</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 border ${
                    audit.performance_source === 'pagespeed'
                      ? 'border-[#00FF9D]/30 text-[#00FF9D]'
                      : 'border-yellow-400/30 text-yellow-400'
                  }`}
                  data-testid="audit-perf-source"
                >
                  <Zap className="w-3 h-3" />
                  Performance via {audit.performance_source === 'pagespeed' ? `PageSpeed (${audit.pagespeed_strategy || 'mobile'})` : 'fallback analyzer'}
                </span>
              </div>
            </div>
          </div>

          {/* Category Scores Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Performance', score: audit.performance_score, key: 'performance' },
              { label: 'SEO', score: audit.seo_score, key: 'seo' },
              { label: 'Security', score: audit.security_score, key: 'security' },
              { label: 'Technical', score: audit.technical_score, key: 'technical' },
              { label: 'Accessibility', score: audit.accessibility_score, key: 'accessibility' }
            ].map((category) => {
              const IconComponent = categoryIcons[category.key].icon;
              const iconColor = categoryIcons[category.key].color;

              return (
                <div key={category.key} className={`bg-[#0A0A0A] border rounded-lg p-4 ${getScoreBgColor(category.score)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <IconComponent className={`w-4 h-4 ${iconColor}`} />
                    <div className="text-xs text-gray-400 uppercase tracking-wide">{category.label}</div>
                  </div>
                  <div className={`text-4xl font-bold ${getScoreColor(category.score)}`}>
                    {category.score}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Performance Metrics Chart */}
          {audit.performance_metrics && (
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                Core Web Vitals
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {audit.performance_metrics.fcp && (
                  <MetricCard label="FCP" value={`${audit.performance_metrics.fcp}s`} good={audit.performance_metrics.fcp < 1.8} />
                )}
                {audit.performance_metrics.lcp && (
                  <MetricCard label="LCP" value={`${audit.performance_metrics.lcp}s`} good={audit.performance_metrics.lcp < 2.5} />
                )}
                {audit.performance_metrics.tti && (
                  <MetricCard label="TTI" value={`${audit.performance_metrics.tti}s`} good={audit.performance_metrics.tti < 3.8} />
                )}
                {audit.performance_metrics.tbt && (
                  <MetricCard label="TBT" value={`${audit.performance_metrics.tbt}ms`} good={audit.performance_metrics.tbt < 200} />
                )}
                {audit.performance_metrics.cls && (
                  <MetricCard label="CLS" value={audit.performance_metrics.cls} good={audit.performance_metrics.cls < 0.1} />
                )}
              </div>
            </div>
          )}

          {/* Issues by Category */}
          <div className="space-y-4">
            {[
              { title: 'Performance Issues', issues: audit.performance_issues, recs: audit.performance_recommendations, icon: Zap, color: 'purple' },
              { title: 'SEO Issues', issues: audit.seo_issues, recs: audit.seo_recommendations, icon: TrendingUp, color: 'blue' },
              { title: 'Security Issues', issues: audit.security_issues, recs: audit.security_recommendations, icon: Shield, color: 'red' },
              { title: 'Technical Issues', issues: audit.technical_issues, recs: audit.technical_recommendations, icon: Wrench, color: 'yellow' },
              { title: 'Accessibility Issues', issues: audit.accessibility_issues, recs: audit.accessibility_recommendations, icon: Eye, color: 'green' }
            ].map((section) => {
              if (section.issues.length === 0 && section.recs.length === 0) return null;

              const IconComponent = section.icon;

              return (
                <div key={section.title} className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-[#1a1a1a] flex items-center gap-2">
                    <IconComponent className={`w-5 h-5 text-${section.color}-400`} />
                    <h2 className="text-lg font-semibold">{section.title}</h2>
                    <span className={`ml-auto px-2 py-1 rounded text-xs ${section.issues.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {section.issues.length} issue{section.issues.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {section.issues.length > 0 ? (
                      <>
                        {section.issues.map((issue) => (
                          <div key={`${section.title}-${issue}`} className="flex items-start gap-3 p-3 bg-[#080808] rounded-lg border border-red-500/20">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-300">{issue}</p>
                            </div>
                          </div>
                        ))}
                        {section.recs.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                            <h3 className="text-sm font-semibold text-[#00FF9D] mb-2 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Recommendations
                            </h3>
                            <ul className="space-y-2">
                              {section.recs.map((rec) => (
                                <li key={`${section.title}-rec-${rec}`} className="text-sm text-gray-400 flex items-start gap-2">
                                  <span className="text-[#00FF9D] mt-1">→</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm">No issues found</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* WCAG Level */}
          {audit.wcag_level && (
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-green-400" />
                <div>
                  <h3 className="font-semibold">WCAG Compliance Estimate</h3>
                  <p className="text-sm text-gray-400">Level: {audit.wcag_level}</p>
                </div>
              </div>
            </div>
          )}

          {/* Audit History */}
          {auditHistory.length > 1 && (
            <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Audit History</h2>
              <div className="space-y-2">
                {auditHistory.slice(0, 5).map((hist) => (
                  <div key={hist.id} className="flex items-center justify-between p-3 bg-[#080808] rounded border border-[#1a1a1a] hover:border-[#00FF9D]/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{hist.url}</p>
                      <p className="text-xs text-gray-500">{new Date(hist.audit_date).toLocaleString()}</p>
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(hist.overall_score)}`}>
                      {hist.overall_score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!audit && !loading && (
        <div className="text-center py-16 bg-[#0A0A0A] border border-[#1a1a1a] rounded-lg">
          <Search className="w-16 h-16 text-[#00FF9D]/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Audit Results</h3>
          <p className="text-gray-400 mb-4">
            Enter a URL and run an audit to see comprehensive health analysis
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Performance
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              SEO
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Security
            </div>
            <div className="flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              Technical
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Accessibility
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for metric cards
const MetricCard = ({ label, value, good }) => (
  <div className={`p-3 rounded-lg border ${good ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
    <div className="text-xs text-gray-400 mb-1">{label}</div>
    <div className={`text-xl font-bold ${good ? 'text-green-400' : 'text-red-400'}`}>{value}</div>
  </div>
);

export default SEOAudit;
