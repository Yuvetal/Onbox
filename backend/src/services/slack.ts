import { WebClient } from '@slack/web-api';

/**
 * Sends a Slack message using the stored user OAuth access token when rate limit is exceeded.
 * Automatically posts to the first available channel (e.g. #new-channel or #general).
 */
export async function notifySlackRateLimit(
  token: string | null | undefined,
  details: {
    senderEmail: string;
    recipientEmail: string;
    subject: string;
    hourlyLimit: number;
    rescheduledTo: Date;
  }
): Promise<void> {
  if (!token) {
    console.log(`[Slack] No Slack token stored for user/sender ${details.senderEmail}. Skipping notification.`);
    return;
  }

  try {
    const client = new WebClient(token);
    const channelTarget = '#all-yuve39s-space';

    const text =
      `🚨 *Hourly Rate Limit Exceeded for Sender ${details.senderEmail}*\n` +
      `• *Subject*: ${details.subject}\n` +
      `• *Recipient*: ${details.recipientEmail}\n` +
      `• *Hourly Limit*: ${details.hourlyLimit}\n` +
      `• *Action*: Email automatically rescheduled to next hour window (*${details.rescheduledTo.toISOString()}*).`;

    const res = await client.chat.postMessage({
      channel: channelTarget,
      text,
    });

    console.log(`✅ Live Slack alert posted successfully to channel '${channelTarget}' (Message TS: ${res.ts}, Channel ID: ${res.channel})`);
  } catch (err: any) {
    console.error(`❌ Failed to post Slack message: ${err.message}`);
  }
}
