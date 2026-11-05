"""Generates the Supabase auth email templates in this folder.
Run:  python3 supabase/email-templates/build.py
Then paste each .html file into Supabase → Authentication → Emails → Templates.
"""
from pathlib import Path

SITE = "https://gigotter.com"
LOGO = f"{SITE}/logo-mark.png"
INK, MUTED, BRAND, PAPER, LINE = "#15171A", "#6B7077", "#245A44", "#F7F6F2", "#E4E1D8"
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

def layout(preheader, heading, intro, button_label, button_url, after="", note=""):
    btn = f'''
          <tr><td style="padding:8px 0 28px">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td bgcolor="{BRAND}" style="border-radius:999px">
                <a href="{button_url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:{FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px">{button_label}</a>
              </td></tr></table>
          </td></tr>''' if button_url else ""
    return f'''<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<title>{heading}</title>
</head>
<body style="margin:0;padding:0;background:{PAPER}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">{preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{PAPER}" style="background:{PAPER}">
    <tr><td align="center" style="padding:40px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
        <tr><td style="padding:0 4px 24px">
          <a href="{SITE}" target="_blank" style="text-decoration:none">
            <img src="{LOGO}" width="40" height="40" alt="Gigotter" style="display:inline-block;vertical-align:middle;border:0">
            <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-family:{FONT};font-size:19px;font-weight:700;color:{INK};letter-spacing:-0.3px">Gigotter</span>
          </a>
        </td></tr>
        <tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid {LINE};border-radius:20px;padding:36px 32px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="font-family:{FONT};font-size:24px;line-height:1.25;font-weight:700;color:{INK};letter-spacing:-0.4px;padding-bottom:12px">{heading}</td></tr>
            <tr><td style="font-family:{FONT};font-size:16px;line-height:1.6;color:{MUTED};padding-bottom:20px">{intro}</td></tr>{btn}
            {after}
            <tr><td style="border-top:1px solid {LINE};padding-top:20px;font-family:{FONT};font-size:13px;line-height:1.6;color:{MUTED}">
              {note or "If you didn’t ask for this, you can safely ignore this email."}
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 4px 0;font-family:{FONT};font-size:12px;line-height:1.6;color:{MUTED}">
          Gigotter · Real work for real businesses, paid to mobile money.<br>
          Accra, Ghana · <a href="{SITE}" style="color:{MUTED}">gigotter.com</a> · <a href="{SITE}/privacy" style="color:{MUTED}">Privacy</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
'''

def fallback(url):
    return f'''<tr><td style="font-family:{FONT};font-size:13px;line-height:1.6;color:{MUTED};padding-bottom:24px">Button not working? Copy this link into your browser:<br><a href="{url}" style="color:{BRAND};word-break:break-all">{url}</a></td></tr>'''

CONF = "{{ .ConfirmationURL }}"
T = {
  "confirm-signup": ("Confirm your Gigotter account", layout(
      "One tap to confirm your email and start earning.",
      "Confirm your email",
      "Welcome to Gigotter! Tap the button below to confirm your email address. Next, you’ll verify your student ID so you can start joining paid gigs.",
      "Confirm my email", CONF, fallback(CONF),
      "If you didn’t create a Gigotter account, you can ignore this email — no account will be created.")),
  "reset-password": ("Reset your Gigotter password", layout(
      "Choose a new password for your Gigotter account.",
      "Reset your password",
      "We got a request to reset the password for <b style=\"color:#15171A\">{{ .Email }}</b>. Tap the button to choose a new one. This link works once and expires in an hour.",
      "Choose a new password", CONF, fallback(CONF),
      "If you didn’t ask to reset your password, ignore this email — your password won’t change.")),
  "magic-link": ("Your Gigotter log-in link", layout(
      "Your one-tap link to log in to Gigotter.",
      "Log in to Gigotter",
      "Tap the button below to log in. This link works once and expires in an hour.",
      "Log in", CONF, fallback(CONF))),
  "change-email": ("Confirm your new email address", layout(
      "Confirm the new email address on your Gigotter account.",
      "Confirm your new email",
      "You asked to change your Gigotter email from <b style=\"color:#15171A\">{{ .Email }}</b> to <b style=\"color:#15171A\">{{ .NewEmail }}</b>. Tap the button to confirm.",
      "Confirm new email", CONF, fallback(CONF),
      "If you didn’t ask for this change, ignore this email and your email address will stay the same.")),
  "invite-user": ("You’ve been invited to Gigotter", layout(
      "You’ve been invited to join Gigotter.",
      "You’re invited",
      "You’ve been invited to join Gigotter. Tap the button to accept and set up your account.",
      "Accept invitation", CONF, fallback(CONF),
      "If you weren’t expecting this invitation, you can ignore this email.")),
  "reauthentication": ("Your Gigotter verification code", layout(
      "Your Gigotter verification code.",
      "Confirm it’s you",
      "Enter this code to continue. It expires in a few minutes.",
      "", "",
      f'''<tr><td style="padding:4px 0 28px"><div style="display:inline-block;padding:14px 22px;background:{PAPER};border:1px solid {LINE};border-radius:12px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:6px;color:{INK}">{{{{ .Token }}}}</div></td></tr>''',
      "If you didn’t try to do this, someone may have your password — change it from the log-in page.")),
}

if __name__ == "__main__":
    here = Path(__file__).parent
    for name, (subject, html) in T.items():
        (here / f"{name}.html").write_text(html)
        print(f"{name}.html  —  subject: {subject}")
