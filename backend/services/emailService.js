import nodemailer from "nodemailer";
import SiteSettings from "../models/SiteSettings.js";

const defaultSiteSettings = {
  siteName: "FashionHub",
  contactEmail: "support@fashionhub.com",
  emailNotifications: true,
  orderNotifications: true,
};

const getOrCreateSiteSettings = async () => {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create(defaultSiteSettings);
  }
  return settings;
};

const parsePort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const hasSmtpConfig = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );

let transporter = null;

const getTransporter = () => {
  if (!hasSmtpConfig()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parsePort(process.env.SMTP_PORT, 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn("[Email] SMTP not configured. Skipping email:", subject);
    return { skipped: true };
  }

  return mailer.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
};

export const sendOrderUpdateEmail = async ({ order, user }) => {
  if (!order || !user?.email) return { skipped: true };

  const settings = await getOrCreateSiteSettings();
  if (!settings.orderNotifications) return { skipped: true };

  const siteName = settings.siteName || "FashionHub";
  const orderStatus = String(order.status || "updated").toUpperCase();
  const orderUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/order/${order.trackingId}`;
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
    : 0;

  const subject = `${siteName}: Order ${order.trackingId} is ${orderStatus}`;
  const text = `Hi ${user.name || "Customer"}, your order ${order.trackingId} is now ${order.status}. Items: ${itemCount}. Total: INR ${Number(order.total || 0)}. Track: ${orderUrl}`;
  const html = `
    <h2>${siteName}</h2>
    <p>Hi ${user.name || "Customer"},</p>
    <p>Your order <strong>${order.trackingId}</strong> is now <strong>${order.status}</strong>.</p>
    <p>Items: ${itemCount}</p>
    <p>Total: INR ${Number(order.total || 0)}</p>
    <p><a href="${orderUrl}">Track your order</a></p>
  `;

  return sendEmail({ to: user.email, subject, text, html });
};

export const sendRefundUpdateEmail = async ({ user, refund, action }) => {
  if (!user?.email || !refund) return { skipped: true };

  const settings = await getOrCreateSiteSettings();
  if (!settings.orderNotifications) return { skipped: true };

  const siteName = settings.siteName || "FashionHub";
  const orderLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/returns`;
  const subject = `${siteName}: Refund request ${action === "approve" ? "approved" : "rejected"}`;
  const text = `Your refund request for order ${refund.trackingId} was ${action === "approve" ? "approved" : "rejected"}. Amount: INR ${Number(refund.amount || 0)}.`;
  const html = `
    <h2>${siteName}</h2>
    <p>Your refund request for order <strong>${refund.trackingId}</strong> was <strong>${action === "approve" ? "approved" : "rejected"}</strong>.</p>
    <p>Amount: INR ${Number(refund.amount || 0)}</p>
    <p><a href="${orderLink}">View Refund Status</a></p>
  `;

  return sendEmail({ to: user.email, subject, text, html });
};

export const sendRegistrationOtpEmail = async ({ email, name, otp, expiresInMinutes = 10 }) => {
  if (!email || !otp) return { skipped: true };

  const settings = await getOrCreateSiteSettings();
  if (!settings.emailNotifications) return { skipped: true };

  const siteName = settings.siteName || "FashionHub";
  const subject = `${siteName}: Your verification OTP`;
  const text = `Hi ${name || "Customer"}, your ${siteName} verification OTP is ${otp}. It expires in ${expiresInMinutes} minutes. If you did not request this, please ignore this email.`;
  const html = `
    <h2>${siteName}</h2>
    <p>Hi ${name || "Customer"},</p>
    <p>Use the OTP below to complete your account verification:</p>
    <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</p>
    <p>This OTP expires in ${expiresInMinutes} minutes.</p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `;

  return sendEmail({ to: email, subject, text, html });
};

export default {
  sendOrderUpdateEmail,
  sendRefundUpdateEmail,
  sendRegistrationOtpEmail,
};
