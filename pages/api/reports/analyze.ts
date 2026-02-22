// pages/api/reports/analyze.ts - POST trigger AI analysis (GLM-4.5V or placeholder)

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REPORT_ANALYSIS_PROMPT = `Analyze this medical or psychological report. Provide a structured summary with these four sections:

1. Report Type — What kind of report is this (e.g., neuropsychological evaluation, blood panel, behavioral assessment)?
2. Key Findings — What are the main results or scores noted in the report?
3. Areas of Concern — Are there any results outside normal ranges or flagged items?
4. Recommendations — What follow-up actions or next steps does the report suggest?

Write in plain, friendly language that a parent can understand. Avoid medical jargon where possible, and briefly explain any terms you must use. End your response with this exact sentence: "This summary is not a substitute for professional medical advice. Please discuss these results with your child's healthcare provider."`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = req.query.id as string;
  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid or missing report id' });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Get-or-create user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError && userError.code === 'PGRST116') {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: session.user.email,
          name: session.user.name || null,
          avatar_url: session.user.image || null,
          provider: 'google',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[reports/analyze] create user error:', createError);
        return res.status(500).json({ error: 'Internal server error' });
      }
      user = newUser;
    } else if (userError) {
      console.error('[reports/analyze] user lookup error:', userError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Fetch report
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Report not found' });
    }
    if (fetchError) {
      console.error('[reports/analyze] fetch error:', fetchError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Update status to analyzing
    await supabase
      .from('reports')
      .update({ status: 'analyzing' })
      .eq('id', id);

    // Check if GLM API is configured
    const glmUrl = process.env.GLM_API_URL;
    const glmKey = process.env.GLM_API_KEY;

    let analysis: string;
    let finalStatus: string;

    if (!glmUrl || !glmKey) {
      // Placeholder mode
      analysis = 'AI analysis is not yet configured. Please check back later.';
      finalStatus = 'completed';
    } else {
      // Call GLM-4.5V
      try {
        const glmResponse = await fetch(glmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${glmKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'glm-4v',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: { url: report.image_url },
                  },
                  {
                    type: 'text',
                    text: REPORT_ANALYSIS_PROMPT,
                  },
                ],
              },
            ],
            max_tokens: 1500,
          }),
        });

        if (!glmResponse.ok) {
          throw new Error(`GLM API error: ${glmResponse.status}`);
        }

        const glmData = await glmResponse.json();
        analysis = glmData.choices?.[0]?.message?.content || 'Analysis completed but no content was returned.';
        finalStatus = 'completed';
      } catch (glmError) {
        console.error('[reports/analyze] GLM error:', glmError);
        analysis = '';
        finalStatus = 'failed';
      }
    }

    // Save result
    const { data: updated, error: updateError } = await supabase
      .from('reports')
      .update({
        analysis: analysis || null,
        status: finalStatus,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('[reports/analyze] update error:', updateError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    return res.status(200).json({
      report: {
        id: updated.id,
        status: updated.status,
        analysis: updated.analysis,
      },
    });
  } catch (error) {
    console.error('[reports/analyze] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
