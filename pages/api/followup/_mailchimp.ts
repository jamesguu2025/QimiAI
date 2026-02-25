// pages/api/followup/_mailchimp.ts — Mailchimp helper for followup module
import { createHash } from 'crypto';

function getMailchimpConfig() {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;

  if (!apiKey || !audienceId || !serverPrefix) {
    return null;
  }

  return {
    baseUrl: `https://${serverPrefix}.api.mailchimp.com/3.0`,
    audienceId,
    authHeader: `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
  };
}

export function getSubscriberHash(email: string): string {
  return createHash('md5').update(email.toLowerCase()).digest('hex');
}

export async function upsertMailchimpMember(
  email: string,
  mergeFields: Record<string, string>,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  const config = getMailchimpConfig();
  if (!config) {
    return { success: false, error: 'Mailchimp not configured' };
  }

  const hash = getSubscriberHash(email);
  const url = `${config.baseUrl}/lists/${config.audienceId}/members/${hash}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.authHeader,
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: 'subscribed',
        merge_fields: {
          FNAME: name || '',
          ...mergeFields,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[followup/_mailchimp] Upsert failed:', errorData);
      return { success: false, error: errorData.detail || errorData.title || 'Unknown Mailchimp error' };
    }

    return { success: true };
  } catch (error) {
    console.error('[followup/_mailchimp] Upsert error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

export async function addMailchimpTag(
  email: string,
  tag: string
): Promise<{ success: boolean; error?: string }> {
  const config = getMailchimpConfig();
  if (!config) {
    return { success: false, error: 'Mailchimp not configured' };
  }

  const hash = getSubscriberHash(email);
  const url = `${config.baseUrl}/lists/${config.audienceId}/members/${hash}/tags`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.authHeader,
      },
      body: JSON.stringify({
        tags: [{ name: tag, status: 'active' }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[followup/_mailchimp] Tag add failed:', errorData);
      return { success: false, error: errorData.detail || errorData.title || 'Unknown Mailchimp error' };
    }

    return { success: true };
  } catch (error) {
    console.error('[followup/_mailchimp] Tag add error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}
