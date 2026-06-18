import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertCircle, ListChecks } from 'lucide-react';

const PRIORITY_STYLES = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30',
  low: 'bg-blue-400/20 text-blue-400 border-blue-500/30',
};

const CAMPAIGN_ORDER = [
  { key: 'technical_site_audit', label: 'Technical Site Audit' },
  { key: 'guest_post_link_building', label: 'Link Building' },
  { key: 'keyword_research', label: 'Keyword Research' },
];

function ActionItem({ item }) {
  const priority = item.priority || 'medium';
  return (
    <div className="p-4 bg-[#080808] rounded-lg border border-[#1a1a1a] space-y-2">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium text-white">{item.title}</h4>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded shrink-0 ${
            PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium
          }`}
        >
          {priority}
        </span>
      </div>
      {item.issue && (
        <p className="text-sm text-gray-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{item.issue}</span>
        </p>
      )}
      <p className="text-sm text-gray-300 pl-6 border-l-2 border-[#00FF9D]/40">
        {item.recommendation}
      </p>
      {item.sop_ref && (
        <p className="text-xs text-gray-500 pl-6">SOP {item.sop_ref}</p>
      )}
    </div>
  );
}

export default function SEOActionPlan({ actionPlan }) {
  if (!actionPlan?.campaigns) return null;

  const { summary, campaigns } = actionPlan;
  const defaultTab = CAMPAIGN_ORDER.find((c) => campaigns[c.key]?.items?.length)?.key
    || 'technical_site_audit';

  return (
    <div className="bg-[#0A0A0A] border border-[#1a1a1a] rounded-lg overflow-hidden" data-testid="seo-action-plan">
      <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-[#00FF9D]" />
          <h2 className="text-lg font-semibold">SEO Action Plan</h2>
        </div>
        {summary && (
          <p className="text-sm text-gray-400">
            {summary.total_actions} action{summary.total_actions !== 1 ? 's' : ''}
            {summary.high_priority > 0 && (
              <span className="text-red-400"> · {summary.high_priority} high priority</span>
            )}
          </p>
        )}
      </div>

      <Tabs defaultValue={defaultTab} className="p-4">
        <TabsList className="bg-[#080808] border border-[#1a1a1a] w-full justify-start flex-wrap h-auto gap-1 p-1">
          {CAMPAIGN_ORDER.map(({ key, label }) => {
            const count = campaigns[key]?.items?.length || 0;
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="data-[state=active]:bg-[#00FF9D]/10 data-[state=active]:text-[#00FF9D] text-gray-400"
              >
                {label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CAMPAIGN_ORDER.map(({ key }) => {
          const items = campaigns[key]?.items || [];
          return (
            <TabsContent key={key} value={key} className="mt-4 space-y-3">
              {items.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No actions in this campaign.</p>
              ) : (
                items.map((item, idx) => (
                  <ActionItem key={`${key}-${idx}-${item.title}`} item={item} />
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
