const notificationService = require('../notificationService');
const { RULES } = require('./notificationRules');
const { getNotificationTemplate } = require('./notificationTemplates');
const dispatchNotification = async ({ user, type, data = {}, relatedEntity = null, dedupeKey }) => {
  try {
    const rule = RULES[type];
    if (!rule?.enabled) return null;
    const template = getNotificationTemplate(type, data);
    return await notificationService.createNotification({ user, type, ...template, priority: rule.priority, channel: rule.channels[0], relatedEntity: relatedEntity ? { entityType: relatedEntity.entityType, entityId: relatedEntity.entityId } : undefined, dedupeKey });
  } catch (error) {
    return null;
  }
};
module.exports = { dispatchNotification };
