// pages/api/reports/upload.ts - POST upload image and create report

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getSupabaseAdmin } from '../../../lib/supabase';
import formidable from 'formidable';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

export const config = { api: { bodyParser: false } };

const VALID_TYPES = ['image/jpeg', 'image/png'];
const FREE_MAX_SIZE = 5 * 1024 * 1024;   // 5 MB
const PRO_MAX_SIZE = 20 * 1024 * 1024;    // 20 MB
const FREE_MAX_REPORTS_PER_MONTH = 1;

function getExtFromMime(mime: string): string {
  return mime === 'image/png' ? 'png' : 'jpg';
}

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
        console.error('[reports/upload] create user error:', createError);
        return res.status(500).json({ error: 'Internal server error' });
      }
      user = newUser;
    } else if (userError) {
      console.error('[reports/upload] user lookup error:', userError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const userId = user!.id;

    // Parse multipart form
    const form = formidable({ maxFileSize: PRO_MAX_SIZE });
    const [fields, files] = await form.parse(req);

    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({ error: 'No file provided' });
    }
    const file = fileArray[0];

    // Validate file type
    if (!file.mimetype || !VALID_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only JPG and PNG images are accepted' });
    }

    // File size check (assume free tier for now)
    const maxSize = FREE_MAX_SIZE; // TODO: check subscription tier for pro users
    if (file.size > maxSize) {
      return res.status(400).json({ error: `File too large. Free plan limit is 5MB.` });
    }

    // Quota check: count reports this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart);

    if ((count || 0) >= FREE_MAX_REPORTS_PER_MONTH) {
      return res.status(400).json({ error: 'Report limit reached. Free plan allows 1 report per month.' });
    }

    // Read file and upload to Supabase Storage
    const reportId = randomUUID();
    const ext = getExtFromMime(file.mimetype);
    const storagePath = `${userId}/${reportId}.${ext}`;
    const fileBuffer = readFileSync(file.filepath);

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('[reports/upload] storage error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('reports')
      .getPublicUrl(storagePath);

    const imageUrl = urlData.publicUrl;

    // Create report record
    const title = (fields.title?.[0] || '').trim() ||
      `Report — ${now.toISOString().split('T')[0]}`;

    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        id: reportId,
        user_id: userId,
        title,
        image_url: imageUrl,
        status: 'uploading',
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('[reports/upload] insert error:', insertError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    return res.status(201).json({
      report: {
        id: report.id,
        title: report.title,
        imageUrl: report.image_url,
        status: report.status,
        createdAt: report.created_at,
      },
    });
  } catch (error) {
    console.error('[reports/upload] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
