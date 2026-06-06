"""Resend email helpers — fire-and-forget, async-safe.

All helpers swallow errors and log them so failed email sends never break
the surrounding HTTP request. When RESEND_API_KEY is not configured, the
helpers no-op and log a single warning.

Env vars (all loaded from /app/backend/.env):
  RESEND_API_KEY       - the Resend API key (re_xxx)
  RESEND_FROM_EMAIL    - the verified sending address (e.g., hello@yourdomain)
  CONTACT_TO_EMAIL     - inbox that receives forwarded contact submissions
"""

import asyncio
import logging
import os
from typing import Optional

import resend

logger = logging.getLogger(__name__)

BRAND_NAME = "Chris Smith — Technical SEO & Web Engineer"
ACCENT = "#00FF9D"
BG = "#0A0A0A"
TEXT = "#E5E5E5"
MUTED = "#A1A1AA"
BORDER = "#1a1a1a"


def is_configured() -> bool:
    return bool(os.environ.get("RESEND_API_KEY") and os.environ.get("RESEND_FROM_EMAIL"))


def _wrap_html(title: str, body_html: str, cta: Optional[dict] = None) -> str:
    """Wrap content in the dark/cyan brand shell (inline CSS only).

    cta = {"label": "...", "url": "..."} renders a cyan button.
    """
    button = ""
    if cta:
        button = (
            f'<tr><td style="padding:24px 0;">'
            f'<a href="{cta["url"]}" '
            f'style="display:inline-block;padding:14px 24px;background:{ACCENT};color:#000;'
            f'text-decoration:none;font-weight:600;letter-spacing:0.05em;font-size:14px;'
            f'text-transform:uppercase;">{cta["label"]}</a>'
            f"</td></tr>"
        )
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:{BG};color:{TEXT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:{BG};">
  <tr><td align="center" style="padding:40px 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:{BG};border:1px solid {BORDER};">
      <tr><td style="padding:32px 32px 0 32px;">
        <div style="color:{ACCENT};font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;">{BRAND_NAME}</div>
        <h1 style="color:#fff;font-size:28px;font-weight:700;margin:16px 0 0 0;line-height:1.2;">{title}</h1>
      </td></tr>
      <tr><td style="padding:16px 32px 32px 32px;color:{TEXT};font-size:15px;line-height:1.55;">
        {body_html}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">{button}</table>
      </td></tr>
      <tr><td style="border-top:1px solid {BORDER};padding:20px 32px;color:{MUTED};font-size:12px;">
        Sent by {BRAND_NAME}. Built in Australia. Remote worldwide.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""


async def _send(to_email: str, subject: str, html: str, text: Optional[str] = None) -> Optional[str]:
    """Async-safe Resend send. Returns the message id on success or None on failure."""
    if not is_configured():
        logger.warning("Resend not configured (RESEND_API_KEY/RESEND_FROM_EMAIL missing) — skipping email to %s", to_email)
        return None
    if not to_email:
        logger.warning("Skipping email send: empty recipient")
        return None

    resend.api_key = os.environ["RESEND_API_KEY"]
    params = {
        "from": os.environ["RESEND_FROM_EMAIL"],
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    if text:
        params["text"] = text

    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        msg_id = result.get("id") if isinstance(result, dict) else None
        logger.info("Resend → %s OK (id=%s, subject=%r)", to_email, msg_id, subject)
        return msg_id
    except Exception as exc:
        logger.error("Resend send failed (to=%s, subject=%r): %s", to_email, subject, exc)
        return None


# ---------- Specific transactional emails ----------

async def send_contact_notification(name: str, email: str, website: Optional[str], message: str) -> Optional[str]:
    """Forward a contact form submission to the site owner inbox."""
    to_addr = os.environ.get("CONTACT_TO_EMAIL")
    if not to_addr:
        logger.warning("CONTACT_TO_EMAIL not set — skipping owner notification")
        return None
    site = website or "—"
    body = f"""
      <p style="color:{MUTED};margin:0 0 8px 0;">New inbound enquiry from your website:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tr><td style="padding:8px 0;color:{MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;width:120px;">Name</td><td style="padding:8px 0;color:#fff;">{name}</td></tr>
        <tr><td style="padding:8px 0;color:{MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Email</td><td style="padding:8px 0;color:#fff;"><a href="mailto:{email}" style="color:{ACCENT};text-decoration:none;">{email}</a></td></tr>
        <tr><td style="padding:8px 0;color:{MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Website</td><td style="padding:8px 0;color:#fff;">{site}</td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;background:#000;border:1px solid {BORDER};white-space:pre-wrap;">{message}</div>
    """
    html = _wrap_html("New contact form submission", body)
    return await _send(to_addr, f"[Contact] {name} — new enquiry", html)


async def send_contact_autoreply(name: str, email: str) -> Optional[str]:
    """Send an auto-confirmation back to the person who filled out the form."""
    body = f"""
      <p>Hi {name},</p>
      <p>Thanks for reaching out — I've received your message and will get back to you within 1–2 business days.</p>
      <p>In the meantime, if it's urgent, just reply to this email and it'll come straight to me.</p>
      <p style="color:{MUTED};margin-top:24px;">— Chris</p>
    """
    html = _wrap_html("Thanks — message received", body)
    return await _send(email, "Thanks — I'll be in touch soon", html)


async def send_audit_ready(client_name: str, client_email: str, site_url: str, overall_score: int, audit_link: Optional[str] = None) -> Optional[str]:
    """Notify a client that their SEO audit has finished."""
    score_color = ACCENT if overall_score >= 70 else "#facc15" if overall_score >= 50 else "#f87171"
    body = f"""
      <p>Hi {client_name or 'there'},</p>
      <p>Your audit for <strong style="color:#fff;">{site_url}</strong> is ready.</p>
      <div style="margin:24px 0;padding:24px;background:#000;border:1px solid {BORDER};text-align:center;">
        <div style="color:{MUTED};font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Overall health score</div>
        <div style="color:{score_color};font-size:56px;font-weight:700;line-height:1;">{overall_score}</div>
        <div style="color:{MUTED};font-size:12px;margin-top:8px;">out of 100</div>
      </div>
      <p>Full breakdown — Performance, SEO, Security, Technical &amp; Accessibility — is available in your dashboard.</p>
    """
    cta = {"label": "View full report", "url": audit_link} if audit_link else None
    html = _wrap_html("Your SEO audit is ready", body, cta=cta)
    return await _send(client_email, f"Your SEO audit for {site_url} is ready", html)
