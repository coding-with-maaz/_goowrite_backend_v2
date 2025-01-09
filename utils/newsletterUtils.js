const { Subscriber } = require('../models/Newsletter');
const Email = require('./email');
const AppError = require('./appError');

// Send newsletter to subscribers
exports.sendNewsletter = async (campaign) => {
  try {
    // Build query for target audience
    const query = {
      status: 'subscribed',
    };

    if (campaign.targetAudience.status?.length) {
      query.status = { $in: campaign.targetAudience.status };
    }

    if (campaign.targetAudience.categories?.length) {
      query['preferences.categories'] = {
        $in: campaign.targetAudience.categories,
      };
    }

    if (campaign.targetAudience.frequency?.length) {
      query['preferences.frequency'] = {
        $in: campaign.targetAudience.frequency,
      };
    }

    // Get subscribers
    const subscribers = await Subscriber.find(query);
    campaign.stats.totalRecipients = subscribers.length;
    await campaign.save();

    // Send emails in batches
    const batchSize = 50;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (subscriber) => {
          try {
            await new Email(subscriber).sendNewsletter(campaign);
            
            // Update campaign stats
            campaign.stats.sent += 1;
            campaign.stats.delivered += 1;
            subscriber.lastEmailSent = Date.now();
            await Promise.all([campaign.save(), subscriber.save()]);
          } catch (error) {
            console.error(`Error sending to ${subscriber.email}:`, error);
            campaign.stats.bounced += 1;
            subscriber.bounceCount += 1;
            
            // Mark as bounced if too many failures
            if (subscriber.bounceCount >= 3) {
              subscriber.status = 'bounced';
            }
            
            await Promise.all([campaign.save(), subscriber.save()]);
          }
        })
      );
    }

    // Update campaign status
    campaign.status = 'sent';
    campaign.sentAt = Date.now();
    await campaign.save();
  } catch (error) {
    console.error('Error sending newsletter:', error);
    campaign.status = 'failed';
    await campaign.save();
    throw new AppError('Failed to send newsletter', 500);
  }
};

// Track email open
exports.trackEmailOpen = async (campaignId, subscriberId) => {
  try {
    const [campaign, subscriber] = await Promise.all([
      Campaign.findById(campaignId),
      Subscriber.findById(subscriberId),
    ]);

    if (campaign && subscriber) {
      campaign.stats.opened += 1;
      await campaign.save();
    }
  } catch (error) {
    console.error('Error tracking email open:', error);
  }
};

// Track email click
exports.trackEmailClick = async (campaignId, subscriberId, link) => {
  try {
    const [campaign, subscriber] = await Promise.all([
      Campaign.findById(campaignId),
      Subscriber.findById(subscriberId),
    ]);

    if (campaign && subscriber) {
      campaign.stats.clicked += 1;
      await campaign.save();
    }
  } catch (error) {
    console.error('Error tracking email click:', error);
  }
};

// Generate newsletter content
exports.generateNewsletterContent = async (campaign) => {
  // Basic template
  const template = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${campaign.subject}</title>
      <style>
        /* Add your newsletter styles here */
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${campaign.title}</h1>
        ${campaign.content}
        <div class="footer">
          <p>
            You're receiving this email because you subscribed to our newsletter.
            <a href="[unsubscribe_link]">Unsubscribe here</a>
          </p>
        </div>
      </div>
      <!-- Tracking pixel -->
      <img src="[tracking_pixel]" alt="" style="display: none;" />
    </body>
    </html>
  `;

  return template;
};

// Validate campaign before sending
exports.validateCampaign = (campaign) => {
  const errors = [];

  if (!campaign.title || campaign.title.length < 3) {
    errors.push('Title must be at least 3 characters long');
  }

  if (!campaign.subject || campaign.subject.length < 3) {
    errors.push('Subject must be at least 3 characters long');
  }

  if (!campaign.content || campaign.content.length < 10) {
    errors.push('Content must be at least 10 characters long');
  }

  if (campaign.status === 'scheduled' && !campaign.scheduledFor) {
    errors.push('Scheduled campaigns must have a scheduledFor date');
  }

  if (errors.length > 0) {
    throw new AppError(errors.join('. '), 400);
  }
};

// Process bounce notifications
exports.processBounce = async (email, bounceType) => {
  try {
    const subscriber = await Subscriber.findOne({ email });
    if (subscriber) {
      subscriber.bounceCount += 1;
      
      if (subscriber.bounceCount >= 3 || bounceType === 'Permanent') {
        subscriber.status = 'bounced';
      }
      
      await subscriber.save();
    }
  } catch (error) {
    console.error('Error processing bounce:', error);
  }
};

// Clean up old campaigns
exports.cleanupOldCampaigns = async (days = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  try {
    await Campaign.deleteMany({
      status: 'sent',
      sentAt: { $lt: cutoffDate },
    });
  } catch (error) {
    console.error('Error cleaning up old campaigns:', error);
  }
};
