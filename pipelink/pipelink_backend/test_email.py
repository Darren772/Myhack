"""Quick test: verify Gmail SMTP login + send a test email."""
import os, smtplib, sys
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

user = os.getenv("GMAIL_USER", "")
pw   = os.getenv("GMAIL_APP_PASSWORD", "")

print(f"GMAIL_USER         = {user}")
print(f"GMAIL_APP_PASSWORD = {'*' * len(pw) if pw else '(not set)'}")

if not user or not pw:
    print("\nERROR: Credentials not set in .env")
    sys.exit(1)

print("\nConnecting to smtp.gmail.com:465 ...")
try:
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as srv:
        srv.login(user, pw)
        print("SUCCESS: SMTP login OK!")

        msg = MIMEText(
            "PipeLink email test — if you see this, Gmail SMTP is working!\n\nPipeLink",
            "plain"
        )
        msg["Subject"] = "PipeLink Email Test"
        msg["From"]    = user
        msg["To"]      = user
        srv.sendmail(user, user, msg.as_string())
        print(f"SUCCESS: Test email sent to {user} - check your inbox!")

except smtplib.SMTPAuthenticationError:
    print("\nERROR: Authentication failed (535)")
    print("The password is not a Gmail App Password.")
    print("Steps:")
    print("  1. Enable 2FA: myaccount.google.com/security")
    print("  2. Create App Password: myaccount.google.com/apppasswords")
    print("  3. Paste the 16-char code (no spaces) into .env as GMAIL_APP_PASSWORD")
except Exception as e:
    print(f"\nERROR: {e}")
