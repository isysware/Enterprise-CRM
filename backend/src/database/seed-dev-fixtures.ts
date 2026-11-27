import { withTransaction } from './connection';
import { PasswordService } from '../services/password.service';
import { logger } from '../utils/logger';

/**
 * DEVELOPMENT FIXTURES SEEDER — STRICTLY NON-PRODUCTION
 *
 * Seeds optional local development accounts for offline frontend testing.
 * Protected by strict environment guard: refuses execution in production.
 */
export async function seedDevFixtures() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SECURITY: seedDevFixtures cannot be executed in production environment.');
  }

  logger.warn('⚠️ Seeding local development fixtures (non-production)...');

  await withTransaction(async (client) => {
    const rolesRes = await client.query<{ id: string; name: string }>('SELECT id, name FROM roles');
    const roleMap = new Map(rolesRes.rows.map((r) => [r.name, r.id]));

    const devUsers = [
      { name: 'Sarah Jenkins', email: 'admin@crm.com', role: 'Admin', pass: 'Admin@123' },
      { name: 'Michael Chang', email: 'manager@crm.com', role: 'Manager', pass: 'Manager@123' },
      { name: 'Emily Rodriguez', email: 'teamlead@crm.com', role: 'Team Lead', pass: 'Lead@123' },
      { name: 'James Wilson', email: 'employee@crm.com', role: 'Employee', pass: 'Emp@123' },
    ];

    for (const u of devUsers) {
      const roleId = roleMap.get(u.role);
      if (!roleId) continue;
      const hash = await PasswordService.hash(u.pass);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role_id, role_name, status, phone)
         VALUES ($1, $2, $3, $4, $5, 'active', '+92 300 0000000')
         ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, status = 'active'`,
        [u.name, u.email, hash, roleId, u.role]
      );
    }
  });

  logger.info('Development fixtures seeded successfully.');
}

if (require.main === module) {
  seedDevFixtures()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
