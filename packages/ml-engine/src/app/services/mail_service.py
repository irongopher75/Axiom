import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings

logger = logging.getLogger(__name__)

class MailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from = settings.SMTP_FROM_EMAIL

        # Set up Jinja2 environment
        # We'll expect templates to be in a 'templates' directory inside services or a global one
        self.jinja_env = Environment(
            loader=FileSystemLoader("packages/ml-engine/src/app/templates"),
            autoescape=select_autoescape(["html", "xml"])
        )

    async def send_email(
        self,
        subject: str,
        recipients: List[str],
        template_name: str,
        context: dict
    ):
        """Sends an HTML email to a list of recipients."""
        if not self.smtp_host:
            logger.warning("SMTP_HOST not configured. Email sending skipped.")
            return

        try:
            template = self.jinja_env.get_template(template_name)
            html_content = template.render(**context)

            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.smtp_from
            message["To"] = ", ".join(recipients)

            # Plain text version (optional, simple fallback)
            text_part = MIMEText("This is an automated report from Axiom. Please view it in an HTML-compatible mail client.", "plain")
            html_part = MIMEText(html_content, "html")

            message.attach(text_part)
            message.attach(html_part)

            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                use_tls=(self.smtp_port == 465),
                start_tls=(self.smtp_port == 587)
            )
            logger.info(f"Email sent: '{subject}' to {len(recipients)} recipients.")

        except Exception as e:
            logger.error(f"Failed to send email: {e}")

# Singleton
mail_service = MailService()
