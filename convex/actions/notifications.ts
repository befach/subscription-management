"use node";

/**
 * Email Notification Action
 *
 * Sends email notifications using ZeptoMail API.
 *
 * Set up via:
 *   npx convex env set ZEPTOMAIL_API_KEY <your-key>
 *   npx convex env set NOTIFICATION_FROM_EMAIL notifications@yourdomain.com
 *   npx convex env set NOTIFICATION_FROM_NAME "Subscription Manager"
 *   npx convex env set ADMIN_EMAIL admin@yourdomain.com
 *
 * Get API key at: https://www.zoho.com/zeptomail/
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { escapeHtml } from "../lib/helpers";

interface ZeptoMailResponse {
  message?: string;
  request_id?: string;
  error?: {
    code: string;
    details: Array<{ message: string }>;
  };
}

interface EmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
}

// Send email via ZeptoMail API
async function sendEmail(params: EmailParams): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const apiKey = process.env.ZEPTOMAIL_API_KEY;
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || "noreply@example.com";
  const fromName = process.env.NOTIFICATION_FROM_NAME || "Subscription Manager";

  if (!apiKey) {
    console.log("ZEPTOMAIL_API_KEY not set, skipping email");
    return { success: false, error: "ZEPTOMAIL_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.zeptomail.in/v1.1/email", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          address: fromEmail,
          name: fromName,
        },
        to: [
          {
            email_address: {
              address: params.to,
              name: params.toName || params.to,
            },
          },
        ],
        subject: params.subject,
        htmlbody: params.htmlBody,
      }),
    });

    const data: ZeptoMailResponse = await response.json();

    if (!response.ok || data.error) {
      const errorMessage = data.error?.details?.[0]?.message || data.error?.code || "Unknown error";
      return { success: false, error: errorMessage };
    }

    return { success: true, requestId: data.request_id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// Internal action: Send renewal reminder email (called from crons)
export const sendRenewalReminder = internalAction({
  args: {
    subscriptionName: v.string(),
    providerName: v.string(),
    renewalDate: v.string(),
    cost: v.number(),
    currencySymbol: v.string(),
    recipientEmail: v.string(),
    daysUntilRenewal: v.number(),
  },
  handler: async (ctx, args) => {
    // Sanitize all user-provided content to prevent XSS
    const safeSubscriptionName = escapeHtml(args.subscriptionName);
    const safeProviderName = escapeHtml(args.providerName);
    const safeCurrencySymbol = escapeHtml(args.currencySymbol);

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6, #6366F1); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
            .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6; }
            .cost { font-size: 24px; font-weight: bold; color: #3B82F6; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Subscription Renewal Reminder</h1>
              <p style="margin: 10px 0 0;">Action required in ${args.daysUntilRenewal} day${args.daysUntilRenewal !== 1 ? "s" : ""}</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>This is a reminder that your subscription is due for renewal soon:</p>

              <div class="highlight">
                <h2 style="margin: 0 0 10px;">${safeSubscriptionName}</h2>
                <p style="margin: 5px 0;"><strong>Provider:</strong> ${safeProviderName}</p>
                <p style="margin: 5px 0;"><strong>Renewal Date:</strong> ${new Date(args.renewalDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> <span class="cost">${safeCurrencySymbol}${args.cost.toLocaleString()}</span></p>
              </div>

              <p>Please ensure payment is arranged before the renewal date to avoid any service interruption.</p>

              <p>Best regards,<br>Subscription Management System</p>
            </div>
            <div class="footer">
              <p>This is an automated notification from your Subscription Management System.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await sendEmail({
      to: args.recipientEmail,
      subject: `Renewal Reminder: ${args.subscriptionName} - ${args.daysUntilRenewal} days`,
      htmlBody,
    });

    console.log(`Renewal reminder sent for ${args.subscriptionName}: ${result.success ? "success" : result.error}`);

    return result;
  },
});

// Internal action: Send request approval notification
export const sendRequestApprovalNotification = internalAction({
  args: {
    requestName: v.string(),
    referenceNumber: v.string(),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    adminNotes: v.optional(v.string()),
    recipientEmail: v.string(),
    requesterName: v.string(),
  },
  handler: async (ctx, args) => {
    const isApproved = args.status === "approved";
    const statusColor = isApproved ? "#10B981" : "#EF4444";
    const statusText = isApproved ? "Approved" : "Rejected";

    // Sanitize all user-provided content to prevent XSS
    const safeRequesterName = escapeHtml(args.requesterName);
    const safeRequestName = escapeHtml(args.requestName);
    const safeReferenceNumber = escapeHtml(args.referenceNumber);
    const safeAdminNotes = args.adminNotes ? escapeHtml(args.adminNotes) : null;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statusColor}; color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
            .status-badge { display: inline-block; background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
            .notes { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Subscription Request Update</h1>
              <p style="margin: 10px 0 0;">Your request has been reviewed</p>
            </div>
            <div class="content">
              <p>Hello ${safeRequesterName},</p>
              <p>Your subscription request has been reviewed:</p>

              <p style="margin: 20px 0;">
                <strong>Request:</strong> ${safeRequestName}<br>
                <strong>Reference:</strong> ${safeReferenceNumber}<br>
                <strong>Status:</strong> <span class="status-badge">${statusText}</span>
              </p>

              ${safeAdminNotes ? `
                <div class="notes">
                  <strong>Admin Notes:</strong><br>
                  ${safeAdminNotes}
                </div>
              ` : ""}

              ${isApproved
                ? "<p>Your requested subscription will be set up shortly. You'll receive further details once it's active.</p>"
                : "<p>If you have questions about this decision, please contact your administrator.</p>"
              }

              <p>Best regards,<br>Subscription Management Team</p>
            </div>
            <div class="footer">
              <p>This is an automated notification from your Subscription Management System.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await sendEmail({
      to: args.recipientEmail,
      toName: args.requesterName,
      subject: `Request ${statusText}: ${args.requestName} (${args.referenceNumber})`,
      htmlBody,
    });

    console.log(`Request notification sent for ${args.referenceNumber}: ${result.success ? "success" : result.error}`);

    return result;
  },
});

// Internal action: Send new request notification to admin
export const sendNewRequestNotification = internalAction({
  args: {
    requestName: v.string(),
    referenceNumber: v.string(),
    requesterName: v.string(),
    requesterDepartment: v.string(),
    cost: v.number(),
    currencySymbol: v.string(),
  },
  handler: async (ctx, args) => {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.log("ADMIN_EMAIL not set, skipping admin notification");
      return { success: false, error: "ADMIN_EMAIL not configured" };
    }

    // Sanitize all user-provided content to prevent XSS
    const safeRequestName = escapeHtml(args.requestName);
    const safeReferenceNumber = escapeHtml(args.referenceNumber);
    const safeRequesterName = escapeHtml(args.requesterName);
    const safeRequesterDepartment = escapeHtml(args.requesterDepartment);
    const safeCurrencySymbol = escapeHtml(args.currencySymbol);

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F59E0B, #EF4444); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
            .request-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; }
            .cost { font-size: 20px; font-weight: bold; color: #3B82F6; }
            .cta { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New Subscription Request</h1>
              <p style="margin: 10px 0 0;">Action required</p>
            </div>
            <div class="content">
              <p>A new subscription request has been submitted and requires your review:</p>

              <div class="request-details">
                <h2 style="margin: 0 0 15px;">${safeRequestName}</h2>
                <p style="margin: 5px 0;"><strong>Reference:</strong> ${safeReferenceNumber}</p>
                <p style="margin: 5px 0;"><strong>Requested By:</strong> ${safeRequesterName}</p>
                <p style="margin: 5px 0;"><strong>Department:</strong> ${safeRequesterDepartment}</p>
                <p style="margin: 5px 0;"><strong>Estimated Cost:</strong> <span class="cost">${safeCurrencySymbol}${args.cost.toLocaleString()}</span></p>
              </div>

              <p>Please log in to the Subscription Management System to review and approve or reject this request.</p>

              <p>Best regards,<br>Subscription Management System</p>
            </div>
            <div class="footer">
              <p>This is an automated notification from your Subscription Management System.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await sendEmail({
      to: adminEmail,
      subject: `New Request: ${args.requestName} from ${args.requesterDepartment}`,
      htmlBody,
    });

    console.log(`Admin notification sent for ${args.referenceNumber}: ${result.success ? "success" : result.error}`);

    return result;
  },
});
