import { logger } from '@app/common/logger';
import { setTimeout } from 'timers/promises';

export const main = async () => {
    logger.info('Application started');
    await setTimeout(1_000);
};
