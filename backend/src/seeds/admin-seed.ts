import { User } from '../models/user.model';
import { logger } from '../utils/logger';

export const seedAdmin = async (): Promise<void> => {
  try {
    // An ACTIVE admin in the DB means everything is fine — nothing to do.
    const adminExists = await User.findOne({
      role: { $in: ['super-admin', 'admin'] },
      isActive: true,
    });
    if (adminExists) {
      logger.info(`Admin already exists (${adminExists.email})`);
      return;
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@footware2.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

    // An admin exists but was deactivated — reactivate it instead of creating
    // a duplicate with the same email (email is unique).
    const inactiveAdmin = await User.findOne({
      role: { $in: ['super-admin', 'admin'] },
    });
    if (inactiveAdmin) {
      inactiveAdmin.isActive = true;
      await inactiveAdmin.save();
      logger.info(`Existing admin was inactive — reactivated (${inactiveAdmin.email})`);
      return;
    }

    const admin = new User({
      name: 'Super Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'super-admin',
      isVerified: true,
      isActive: true,
      phone: '+92 300 0000000',
    });

    await admin.save();
    logger.info(
      `Admin created successfully (${adminEmail}) — credentials from ADMIN_EMAIL / ADMIN_PASSWORD in backend/.env`
    );
  } catch (error) {
    logger.error('Error seeding admin:', error);
  }
};
