import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sendInternalEmail } from '@/lib/mailer';

export const config = {
  maxDuration: 60,
};

type AnalyticsEventRow = {
  event_name: string;
  user_id: string | null;
  anonymous_id: string | null;
  session_id: string | null;
  properties: Record<string, unknown> | null;
  created_at: string;
};

const FUNNEL_EVENTS = [
  'landing:cta_click',
  'auth:signup_success',
  'auth:login_success',
  'onboarding:step_complete',
  'onboarding:step_dropoff',
  'chat:first_message_sent',
  'chat:message_count_milestone_reach',
  'memory:fact_extracted',
  'plan:save_prompt_show',
  'plan:save_prompt_click',
  'plan:item_saved',
  'contact:form_submitted',
  'chat:error',
];

function verifyCron(req: NextApiRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.authorization || '';
  return header === `Bearer ${secret}`;
}

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function countByEvent(rows: AnalyticsEventRow[]) {
  const counts: Record<string, number> = {};
  for (const event of FUNNEL_EVENTS) counts[event] = 0;
  for (const row of rows) {
    counts[row.event_name] = (counts[row.event_name] || 0) + 1;
  }
  return counts;
}

function uniqueActor(row: AnalyticsEventRow) {
  return row.user_id || row.anonymous_id || row.session_id || 'unknown';
}

function countUniqueActors(rows: AnalyticsEventRow[], eventName: string) {
  return new Set(rows.filter((row) => row.event_name === eventName).map(uniqueActor)).size;
}

function countStep(rows: AnalyticsEventRow[], stepNumber: number) {
  return rows.filter((row) => (
    row.event_name === 'onboarding:step_complete' &&
    Number(row.properties?.step_number) === stepNumber
  )).length;
}

function countMilestone(rows: AnalyticsEventRow[], milestone: number) {
  return rows.filter((row) => (
    row.event_name === 'chat:message_count_milestone_reach' &&
    Number(row.properties?.milestone) === milestone
  )).length;
}

function countForbiddenKeys(rows: AnalyticsEventRow[]) {
  const forbidden = new Set([
    'email',
    'name',
    'child_name',
    'childName',
    'contact',
    'message',
    'prompt',
    'response',
    'chat_text',
    'memory_value',
    'plan_strategy',
    'plan_pain_point',
    'user_agent',
    'ip',
    'ip_address',
  ]);

  return rows.filter((row) => (
    Object.keys(row.properties || {}).some((key) => forbidden.has(key))
  )).length;
}

function topChatErrorStages(rows: AnalyticsEventRow[]) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.event_name !== 'chat:error') continue;
    const stage = typeof row.properties?.error_stage === 'string'
      ? row.properties.error_stage
      : 'unknown';
    counts[stage] = (counts[stage] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function pct(numerator: number, denominator: number) {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trend(current: number, previous: number) {
  const delta = current - previous;
  if (delta === 0) return '0';
  return `${delta > 0 ? '+' : ''}${delta}`;
}

function metricCard(label: string, value: number | string, subtext: string, accent = '#0f766e') {
  return `
    <td style="width:33.33%;padding:6px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
        <tr>
          <td style="padding:16px;">
            <div style="font-size:12px;line-height:16px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(label)}</div>
            <div style="margin-top:8px;font-size:30px;line-height:34px;color:#0f172a;font-weight:800;">${value}</div>
            <div style="margin-top:6px;font-size:12px;line-height:16px;color:${accent};font-weight:700;">${escapeHtml(subtext)}</div>
          </td>
        </tr>
      </table>
    </td>`;
}

function funnelRow(label: string, value: number, max: number, subtext = '') {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return `
    <tr>
      <td style="padding:10px 0;width:170px;font-size:13px;line-height:18px;color:#334155;font-weight:700;">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;">
        <div style="height:12px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
          <div style="height:12px;width:${width}%;background:linear-gradient(90deg,#0f766e,#7c3aed);border-radius:999px;"></div>
        </div>
        ${subtext ? `<div style="margin-top:5px;font-size:11px;line-height:14px;color:#64748b;">${escapeHtml(subtext)}</div>` : ''}
      </td>
      <td style="padding:10px 0;width:58px;text-align:right;font-size:16px;line-height:20px;color:#0f172a;font-weight:800;">${value}</td>
    </tr>`;
}

function buildReport(rows: AnalyticsEventRow[], previousRows: AnalyticsEventRow[], start: Date, end: Date) {
  const counts = countByEvent(rows);
  const previousCounts = countByEvent(previousRows);
  const firstChatActors = countUniqueActors(rows, 'chat:first_message_sent');
  const signupActors = countUniqueActors(rows, 'auth:signup_success');
  const landingClicks = counts['landing:cta_click'] || 0;
  const signupSuccess = counts['auth:signup_success'] || 0;
  const loginSuccess = counts['auth:login_success'] || 0;
  const onboardingStep1 = countStep(rows, 1);
  const onboardingStep2 = countStep(rows, 2);
  const onboardingStep3 = countStep(rows, 3);
  const onboardingDropoff = counts['onboarding:step_dropoff'] || 0;
  const firstChats = counts['chat:first_message_sent'] || 0;
  const milestone3 = countMilestone(rows, 3);
  const milestone5 = countMilestone(rows, 5);
  const milestone10 = countMilestone(rows, 10);
  const memoryExtracted = counts['memory:fact_extracted'] || 0;
  const saveShown = counts['plan:save_prompt_show'] || 0;
  const saveClicked = counts['plan:save_prompt_click'] || 0;
  const saved = counts['plan:item_saved'] || 0;
  const contactSubmitted = counts['contact:form_submitted'] || 0;
  const errors = counts['chat:error'] || 0;
  const previousErrors = previousCounts['chat:error'] || 0;
  const forbiddenCount = countForbiddenKeys(rows);
  const errorStages = topChatErrorStages(rows);
  const funnelMax = Math.max(
    landingClicks,
    signupSuccess,
    onboardingStep1,
    onboardingStep2,
    onboardingStep3,
    firstChats,
    milestone3,
    memoryExtracted,
    1
  );

  const lines = [
    `Qimi Analytics Weekly Report`,
    `Period: ${formatDate(start)} ~ ${formatDate(end)}`,
    '',
    'Funnel',
    `- Landing CTA clicks: ${landingClicks}`,
    `- Signup success: ${signupSuccess} (${signupActors} unique actors)`,
    `- Login success: ${loginSuccess}`,
    `- Onboarding step 1 complete: ${onboardingStep1}`,
    `- Onboarding step 2 complete: ${onboardingStep2}`,
    `- Onboarding step 3 complete: ${onboardingStep3}`,
    `- Onboarding dropoff: ${onboardingDropoff}`,
    `- First chat sent: ${firstChats} (${firstChatActors} unique actors)`,
    `- Chat milestone 3: ${milestone3}`,
    `- Chat milestone 5: ${milestone5}`,
    `- Chat milestone 10: ${milestone10}`,
    `- Memory extracted: ${memoryExtracted}`,
    '',
    'Growth Plan',
    `- Save prompt shown: ${saveShown}`,
    `- Save prompt clicked: ${saveClicked} (${pct(saveClicked, saveShown)} of shown)`,
    `- Plan items saved: ${saved} (${pct(saved, saveClicked)} of clicks)`,
    '',
    'Contact',
    `- Contact forms submitted: ${contactSubmitted}`,
    '',
    'Reliability',
    `- Chat errors: ${errors} (${errors - previousErrors >= 0 ? '+' : ''}${errors - previousErrors} vs previous period)`,
    `- Top error stages: ${errorStages.length ? errorStages.map(([stage, count]) => `${stage}=${count}`).join(', ') : 'none'}`,
    '',
    'Privacy Check',
    `- Events with forbidden keys: ${forbiddenCount}`,
  ];

  const text = lines.join('\n');
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="720" cellspacing="0" cellpadding="0" style="width:720px;max-width:100%;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.08);">
            <tr>
              <td style="padding:26px 30px;background:linear-gradient(135deg,#0f766e,#4f46e5);color:#ffffff;">
                <div style="font-size:13px;line-height:18px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.88;">Qimi Analytics</div>
                <div style="margin-top:8px;font-size:28px;line-height:34px;font-weight:850;">Weekly Product Report</div>
                <div style="margin-top:8px;font-size:14px;line-height:20px;opacity:.86;">${formatDate(start)} ~ ${formatDate(end)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 8px;background:#f8fafc;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    ${metricCard('Landing CTA', landingClicks, `${trend(landingClicks, previousCounts['landing:cta_click'] || 0)} vs previous`)}
                    ${metricCard('First Chats', firstChats, `${firstChatActors} unique actors`, '#4f46e5')}
                    ${metricCard('Plan Saved', saved, `${pct(saved, Math.max(saveClicked, 1))} of clicks`, '#7c3aed')}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px 4px;">
                <div style="font-size:18px;line-height:24px;font-weight:850;color:#0f172a;">Funnel</div>
                <div style="margin-top:4px;font-size:12px;line-height:18px;color:#64748b;">Counts are event totals for the reporting window. Bars are relative to the largest funnel count.</div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;border-collapse:collapse;">
                  ${funnelRow('Landing CTA', landingClicks, funnelMax)}
                  ${funnelRow('Signup success', signupSuccess, funnelMax, `${signupActors} unique actors`)}
                  ${funnelRow('Onboarding step 1', onboardingStep1, funnelMax)}
                  ${funnelRow('Onboarding step 2', onboardingStep2, funnelMax)}
                  ${funnelRow('Onboarding complete', onboardingStep3, funnelMax, `${onboardingDropoff} dropoff events`)}
                  ${funnelRow('First chat sent', firstChats, funnelMax, `${firstChatActors} unique actors`)}
                  ${funnelRow('Chat milestone 3', milestone3, funnelMax)}
                  ${funnelRow('Memory extracted', memoryExtracted, funnelMax)}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 8px;background:#ffffff;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    ${metricCard('Save Shown', saveShown, 'Growth Plan prompt')}
                    ${metricCard('Save Clicked', saveClicked, `${pct(saveClicked, saveShown)} of shown`, '#4f46e5')}
                    ${metricCard('Saved', saved, `${pct(saved, saveClicked)} of clicks`, '#7c3aed')}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 30px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="width:50%;padding-right:8px;vertical-align:top;">
                      <div style="border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#f8fafc;">
                        <div style="font-size:15px;line-height:20px;font-weight:850;">Reliability</div>
                        <div style="margin-top:10px;font-size:28px;line-height:32px;font-weight:850;color:${errors > 0 ? '#b91c1c' : '#0f766e'};">${errors}</div>
                        <div style="font-size:12px;line-height:18px;color:#64748b;">chat errors (${trend(errors, previousErrors)} vs previous)</div>
                        <div style="margin-top:10px;font-size:12px;line-height:18px;color:#334155;">Top stages: ${escapeHtml(errorStages.length ? errorStages.map(([stage, count]) => `${stage}=${count}`).join(', ') : 'none')}</div>
                      </div>
                    </td>
                    <td style="width:50%;padding-left:8px;vertical-align:top;">
                      <div style="border:1px solid #e2e8f0;border-radius:14px;padding:16px;background:#f8fafc;">
                        <div style="font-size:15px;line-height:20px;font-weight:850;">Privacy Check</div>
                        <div style="margin-top:10px;font-size:28px;line-height:32px;font-weight:850;color:${forbiddenCount > 0 ? '#b91c1c' : '#0f766e'};">${forbiddenCount}</div>
                        <div style="font-size:12px;line-height:18px;color:#64748b;">events with forbidden keys</div>
                        <div style="margin-top:10px;font-size:12px;line-height:18px;color:#334155;">Contact submissions: ${contactSubmitted} · Login success: ${loginSuccess}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;line-height:16px;color:#64748b;">
                Internal report generated from Qimi-controlled analytics events. No chat text, child names, contact content, memory values, or plan text are included.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { text, html };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyCron(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const end = startOfDayUtc(new Date());
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('analytics_events')
    .select('event_name, user_id, anonymous_id, session_id, properties, created_at')
    .gte('created_at', previousStart.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: false })
    .limit(10000);

  if (error) {
    console.error('[analytics/weekly-report] query error:', error);
    return res.status(500).json({ error: 'Failed to load analytics events' });
  }

  const rows = (data || []) as AnalyticsEventRow[];
  const currentRows = rows.filter((row) => new Date(row.created_at) >= start);
  const previousRows = rows.filter((row) => new Date(row.created_at) < start);
  const report = buildReport(currentRows, previousRows, start, end);
  const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true';

  if (!dryRun) {
    await sendInternalEmail({
      subject: `Qimi Analytics Weekly Report (${formatDate(start)} ~ ${formatDate(end)})`,
      text: report.text,
      html: report.html,
    });
  }

  return res.status(200).json({
    success: true,
    sent: !dryRun,
    dryRun,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    eventCount: currentRows.length,
    report: dryRun ? report.text : undefined,
    html: dryRun ? report.html : undefined,
  });
}
