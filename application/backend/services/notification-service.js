const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { createClient } = require('redis');

class NotificationService {
    constructor() {
        this.emailTransporter = this.setupEmailTransporter();
        this.smsClient = this.setupSMSClient();
        this.redisClient = createClient();
        this.templates = this.loadNotificationTemplates();
    }

    setupEmailTransporter() {
        return nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    setupSMSClient() {
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        }
        return null;
    }

    loadNotificationTemplates() {
        return {
            PERMIT_SUBMITTED: {
                email: {
                    subject: 'NFPA Permit Application Received - {{permitNumber}}',
                    body: `Dear {{applicantName}},
                    
Your NFPA permit application has been received and assigned permit number {{permitNumber}}.

Project Details:
- Type: {{permitType}}
- Address: {{projectAddress}}
- Estimated Review Time: {{estimatedDays}} business days

You can track your permit status at: {{trackingUrl}}

Thank you,
Fire Department Permit Office`
                },
                sms: 'NFPA Permit {{permitNumber}} received. Est. {{estimatedDays}} days for review. Track: {{trackingUrl}}'
            },
            PERMIT_APPROVED: {
                email: {
                    subject: 'APPROVED: NFPA Permit {{permitNumber}}',
                    body: `Congratulations! Your NFPA permit {{permitNumber}} has been APPROVED.

Next Steps:
1. Download your permit: {{permitUrl}}
2. Schedule required inspections: {{inspectionUrl}}
3. Review conditions: {{conditionsUrl}}

Inspections Required:
{{#inspections}}
- {{name}}: {{description}}
{{/inspections}}

Contact us at {{contactPhone}} with questions.`
                },
                sms: '✅ NFPA Permit {{permitNumber}} APPROVED! Download: {{permitUrl}} Schedule inspections: {{inspectionUrl}}'
            },
            INSPECTION_SCHEDULED: {
                email: {
                    subject: 'Inspection Scheduled - {{inspectionType}}',
                    body: `Your {{inspectionType}} inspection has been scheduled.

Details:
- Date: {{inspectionDate}}
- Time: {{inspectionTime}}
- Inspector: {{inspectorName}}
- Location: {{projectAddress}}

Preparation checklist has been sent separately. Please ensure all requirements are met before the inspection.`
                },
                sms: '🔍 {{inspectionType}} scheduled for {{inspectionDate}} at {{inspectionTime}}. Inspector: {{inspectorName}}'
            },
            INSPECTION_PASSED: {
                email: {
                    subject: '✅ Inspection PASSED - {{inspectionType}}',
                    body: `Good news! Your {{inspectionType}} inspection has PASSED.

Inspector: {{inspectorName}}
Date: {{inspectionDate}}
Notes: {{inspectorNotes}}

{{#nextInspection}}
Next Inspection: {{nextInspectionType}} - We'll contact you soon to schedule.
{{/nextInspection}}

{{#projectComplete}}
🎉 All inspections complete! Your project is approved for occupancy.
{{/projectComplete}}`
                },
                sms: '✅ {{inspectionType}} PASSED! {{#nextInspection}}Next: {{nextInspectionType}}{{/nextInspection}}{{#projectComplete}}🎉 Project complete!{{/projectComplete}}'
            },
            INSPECTION_FAILED: {
                email: {
                    subject: '❌ Inspection Requires Corrections - {{inspectionType}}',
                    body: `Your {{inspectionType}} inspection requires corrections before approval.

Issues Found:
{{#violations}}
- {{description}} (Code: {{code}})
  Correction: {{correction}}
{{/violations}}

Next Steps:
1. Address all violations listed above
2. Contact us to reschedule: {{contactPhone}}
3. Re-inspection fee: {{reinspectionFee}}

Inspector: {{inspectorName}}
Report: {{reportUrl}}`
                },
                sms: '❌ {{inspectionType}} needs corrections. {{violationCount}} issues found. Report: {{reportUrl}} Call {{contactPhone}}'
            }
        };
    }

    async sendNotification(type, recipient, data, preferences = {}) {
        try {
            const template = this.templates[type];
            if (!template) {
                throw new Error(`Unknown notification type: ${type}`);
            }

            const results = {};

            // Send email if enabled
            if (preferences.email !== false && recipient.email) {
                results.email = await this.sendEmail(recipient.email, template.email, data);
            }

            // Send SMS if enabled and phone available
            if (preferences.sms === true && recipient.phone && this.smsClient) {
                results.sms = await this.sendSMS(recipient.phone, template.sms, data);
            }

            // Store notification record
            await this.logNotification(type, recipient, data, results);

            return results;

        } catch (error) {
            console.error('Notification sending failed:', error);
            throw error;
        }
    }

    async sendEmail(to, template, data) {
        const subject = this.renderTemplate(template.subject, data);
        const body = this.renderTemplate(template.body, data);

        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@nfpapermits.gov',
            to: to,
            subject: subject,
            text: body,
            html: this.convertToHTML(body)
        };

        const result = await this.emailTransporter.sendMail(mailOptions);
        return { messageId: result.messageId, status: 'sent' };
    }

    async sendSMS(to, template, data) {
        if (!this.smsClient) {
            return { status: 'skipped', reason: 'SMS not configured' };
        }

        const message = this.renderTemplate(template, data);
        
        const result = await this.smsClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        });

        return { sid: result.sid, status: 'sent' };
    }

    renderTemplate(template, data) {
        let rendered = template;
        
        // Simple template rendering (replace {{variable}} with data)
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            rendered = rendered.replace(regex, data[key] || '');
        });

        // Handle arrays (simple loop for {{#array}} blocks)
        rendered = rendered.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (match, arrayName, content) => {
            const array = data[arrayName];
            if (Array.isArray(array)) {
                return array.map(item => {
                    let itemContent = content;
                    Object.keys(item).forEach(key => {
                        const regex = new RegExp(`{{${key}}}`, 'g');
                        itemContent = itemContent.replace(regex, item[key] || '');
                    });
                    return itemContent;
                }).join('');
            }
            return '';
        });

        return rendered;
    }

    convertToHTML(text) {
        return text
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    async logNotification(type, recipient, data, results) {
        const logEntry = {
            type,
            recipient: {
                email: recipient.email,
                phone: recipient.phone ? recipient.phone.replace(/\d(?=\d{4})/g, '*') : null
            },
            timestamp: new Date().toISOString(),
            permitNumber: data.permitNumber,
            results: results,
            status: 'completed'
        };

        // Store in Redis for recent activity
        const key = `notification:${data.permitNumber}:${Date.now()}`;
        await this.redisClient.setex(key, 86400, JSON.stringify(logEntry)); // 24 hour expiry
    }

    async getNotificationHistory(permitNumber) {
        const keys = await this.redisClient.keys(`notification:${permitNumber}:*`);
        const notifications = [];

        for (const key of keys) {
            const data = await this.redisClient.get(key);
            if (data) {
                notifications.push(JSON.parse(data));
            }
        }

        return notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Bulk notification methods for system-wide announcements
    async sendBulkNotification(type, recipients, data) {
        const results = [];
        const batchSize = 10;

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            const batchPromises = batch.map(recipient => 
                this.sendNotification(type, recipient, data).catch(err => ({ error: err.message }))
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return results;
    }
}

module.exports = NotificationService;
