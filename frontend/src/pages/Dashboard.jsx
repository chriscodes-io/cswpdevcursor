import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  Search,
  Activity,
  Plus,
  ChevronUp,
  ListChecks,
} from 'lucide-react';
import { dashboardAPI, projectsAPI, clientsAPI, seoAuditAPI } from '../lib/api';
import { logError } from '../lib/logger';

const formatRelative = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString();
};

const badgeClass = (kind) => {
  const map = {
    active: 'bg-[#00FF7F]/12 text-[#00FF7F]',
    completed: 'bg-[#00FF7F]/12 text-[#00FF7F]',
    pending: 'bg-amber-500/12 text-amber-400',
    'on-hold': 'bg-amber-500/12 text-amber-400',
    seo: 'bg-blue-400/12 text-blue-400',
    webdev: 'bg-purple-400/12 text-purple-400',
    both: 'bg-[#00FF7F]/12 text-[#00FF7F]',
  };
  return map[kind] || 'bg-muted text-muted-foreground';
};

const Dashboard = ({ currentUser }) => {
  const [stats, setStats] = useState({
    active_projects: 0,
    total_clients: 0,
    audits_this_month: 0,
    audits_last_month: 0,
    avg_audit_score: null,
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const firstName = useMemo(() => {
    const name = currentUser?.name || JSON.parse(localStorage.getItem('currentUser') || '{}').name;
    return name?.split(' ')[0] || 'there';
  }, [currentUser]);

  const loadData = useCallback(async () => {
    try {
      const [statsData, projectsData, clientsData] = await Promise.all([
        dashboardAPI.getStats(),
        projectsAPI.getAll(),
        clientsAPI.getAll(),
      ]);

      setStats(statsData);

      const topProjects = projectsData.slice(0, 5);
      const withAudits = await Promise.all(
        topProjects.map(async (project) => {
          try {
            const audits = await seoAuditAPI.getAudits(project.id);
            return { ...project, lastAudit: audits[0] || null };
          } catch {
            return { ...project, lastAudit: null };
          }
        })
      );
      setRecentProjects(withAudits);

      const activityItems = [];

      withAudits.forEach((p) => {
        if (p.lastAudit) {
          activityItems.push({
            id: `audit-${p.lastAudit.id}`,
            color: '#00FF7F',
            text: `Audit completed — ${p.name} (Score: ${p.lastAudit.overall_score})`,
            time: p.lastAudit.audit_date,
          });
        }
      });

      clientsData.slice(0, 3).forEach((c) => {
        if (c.created_at) {
          activityItems.push({
            id: `client-${c.id}`,
            color: '#60a5fa',
            text: `New client added — ${c.name}`,
            time: c.created_at,
          });
        }
      });

      activityItems.sort((a, b) => new Date(b.time) - new Date(a.time));
      setActivity(activityItems.slice(0, 5));
    } catch (error) {
      logError('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const auditTrend = stats.audits_this_month - stats.audits_last_month;
  const auditTrendLabel =
    auditTrend > 0
      ? `${auditTrend} more than last month`
      : auditTrend < 0
        ? `${Math.abs(auditTrend)} fewer than last month`
        : 'Same as last month';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground text-sm">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Welcome back, {firstName}. Here&apos;s your project overview.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            to="/clients"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-border bg-transparent hover:bg-white/[0.04] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Client
          </Link>
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-primary text-primary-foreground hover:opacity-[0.84] transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            label: 'Active Projects',
            value: stats.active_projects,
            sub: `Across ${stats.total_clients} client${stats.total_clients === 1 ? '' : 's'}`,
            icon: FolderKanban,
            testId: 'stat-card-active-projects',
          },
          {
            label: 'Total Clients',
            value: stats.total_clients,
            sub: 'Active retainers',
            icon: Users,
            testId: 'stat-card-total-clients',
          },
          {
            label: 'Audits This Month',
            value: stats.audits_this_month,
            trend: auditTrendLabel,
            trendUp: auditTrend >= 0,
            icon: Search,
            testId: 'stat-card-audits',
          },
          {
            label: 'Avg Audit Score',
            value: stats.avg_audit_score != null ? Math.round(stats.avg_audit_score) : '—',
            trend: stats.avg_audit_score != null ? 'Last 20 audits' : 'No audits yet',
            trendUp: true,
            icon: Activity,
            testId: 'stat-card-avg-score',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors"
            data-testid={kpi.testId}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] text-muted-foreground uppercase tracking-[0.06em]">{kpi.label}</span>
              <div className="w-[34px] h-[34px] bg-primary/10 rounded-[7px] flex items-center justify-center text-primary">
                <kpi.icon className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </div>
            <div className="font-mono-brand text-[26px] font-semibold leading-none">{kpi.value}</div>
            {kpi.sub && <p className="text-[11px] text-muted-foreground mt-1">{kpi.sub}</p>}
            {kpi.trend && (
              <p className={`text-[11px] mt-1 inline-flex items-center gap-0.5 ${kpi.trendUp ? 'text-[#00FF7F]' : 'text-red-400'}`}>
                {kpi.trendUp && <ChevronUp className="w-2.5 h-2.5" strokeWidth={2} />}
                {kpi.trend}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Projects</h2>
            <Link to="/projects" className="text-xs text-primary hover:opacity-75 no-underline">
              View all →
            </Link>
          </div>
          {recentProjects.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">No projects yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Project', 'Type', 'Status', 'Last audit'].map((h) => (
                      <th
                        key={h}
                        className="text-[10px] uppercase tracking-[0.07em] text-[#444] px-5 py-2.5 font-medium text-left border-b border-border"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-[13px] border-b border-border">
                        <span className="inline-flex items-center">
                          <span className="w-7 h-7 bg-primary/10 rounded-[5px] inline-flex items-center justify-center text-primary mr-2">
                            <FolderKanban className="w-3 h-3" />
                          </span>
                          {project.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 border-b border-border">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeClass(project.type)}`}>
                          {project.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 border-b border-border">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeClass(project.status)}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-muted-foreground border-b border-border">
                        {project.lastAudit
                          ? `${formatRelative(project.lastAudit.audit_date)} — Score ${project.lastAudit.overall_score}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <span className="text-xs text-primary opacity-60">Live</span>
          </div>
          <div>
            {activity.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-start gap-3 border-b border-border last:border-b-0">
                  <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: item.color }} />
                  <div>
                    <p className="text-xs leading-relaxed">{item.text}</p>
                    <p className="text-[11px] text-[#444] mt-0.5">{formatRelative(item.time)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            to: '/seo-audit',
            icon: Search,
            title: 'Run SEO Audit',
            desc: 'Analyse performance, SEO health, security and accessibility',
          },
          {
            to: '/tasks',
            icon: ListChecks,
            title: 'Manage Tasks',
            desc: 'View and organise your project tasks across all clients',
          },
          {
            to: '/clients',
            icon: Users,
            title: 'View Clients',
            desc: 'Manage client relationships and audit history',
          },
        ].map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="bg-card border border-border rounded-xl p-5 flex items-start gap-3.5 hover:border-primary/20 hover:bg-[#161616] transition-colors no-underline text-inherit"
          >
            <div className="w-[38px] h-[38px] bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold mb-0.5">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
