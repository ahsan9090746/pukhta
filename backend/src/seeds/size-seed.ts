import { Size } from '../models/size.model';
import { logger } from '../utils/logger';

const defaultSizes = [
  { label: 'PK 7 / EU 40 / US 8', pk: '7', eu: '40', us: '8', sortOrder: 1 },
  { label: 'PK 8 / EU 41 / US 9', pk: '8', eu: '41', us: '9', sortOrder: 2 },
  { label: 'PK 9 / EU 42 / US 10', pk: '9', eu: '42', us: '10', sortOrder: 3 },
  { label: 'PK 10 / EU 43 / US 11', pk: '10', eu: '43', us: '11', sortOrder: 4 },
  { label: 'PK 11 / EU 44 / US 12', pk: '11', eu: '44', us: '12', sortOrder: 5 },
  { label: 'PK 12 / EU 45 / US 13', pk: '12', eu: '45', us: '13', sortOrder: 6 },
];

export const seedSizes = async (): Promise<void> => {
  try {
    const count = await Size.countDocuments();
    if (count > 0) {
      logger.info(`Sizes already seeded (${count} sizes exist)`);
      return;
    }

    await Size.insertMany(defaultSizes);
    logger.info(`Seeded ${defaultSizes.length} default sizes`);
  } catch (error) {
    logger.error('Error seeding sizes:', error);
  }
};
