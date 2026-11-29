import { query, withTransaction } from './connection';
import {
  CANONICAL_ROLES,
  CANONICAL_CAPABILITIES,
  DEFAULT_ROLE_PERMISSIONS,
} from '../constants/rbac.constants';
import { PasswordService } from '../services/password.service';
import { logger } from '../utils/logger';

export interface SeedResult {
  rolesCreatedOrFound: number;
  permissionsSeeded: number;
  superAdminBootstrapped: boolean;
  bootstrapEmail?: string;
}

/**
 * System Data Seeder
 * Seeds strictly essential canonical roles, default 21-capability matrices,
 * and boots an initial Super Admin if no administrator accounts exist.
 * Zero mock business data.
 */
export class DatabaseSeeder {
  public static async seed(): Promise<SeedResult> {
    logger.info('Starting system database seeding...');

    let rolesCount = 0;
    let permissionsCount = 0;
    let superAdminBootstrapped = false;
    let bootstrapEmail: string | undefined;

    await withTransaction(async (client) => {
      // 1. Seed / Upsert the 5 Canonical Roles
      const roleMap = new Map<string, string>(); // role_name -> role_id

      for (const roleDef of DEFAULT_ROLE_PERMISSIONS) {
        const isProtected = roleDef.role === 'Super Admin' || roleDef.role === 'Admin';
        const res = await client.query<{ id: string; name: string }>(
          `INSERT INTO roles (name, description, is_protected)
           VALUES ($1, $2, $3)
           ON CONFLICT (name) DO UPDATE
           SET description = EXCLUDED.description, is_protected = EXCLUDED.is_protected, updated_at = CURRENT_TIMESTAMP
           RETURNING id, name`,
          [roleDef.role, roleDef.description, isProtected]
        );

        const row = res.rows[0];
        roleMap.set(row.name, row.id);
        rolesCount++;
      }

      // 2. Seed Default 21-Capability Permission Matrices for each Role
      for (const roleDef of DEFAULT_ROLE_PERMISSIONS) {
        const roleId = roleMap.get(roleDef.role);
        if (!roleId) continue;

        for (const cap of CANONICAL_CAPABILITIES) {
          const isGranted = Boolean((roleDef as unknown as Record<string, unknown>)[cap]);
          await client.query(
            `INSERT INTO role_permissions (role_id, capability, is_granted)
             VALUES ($1, $2, $3)
             ON CONFLICT (role_id, capability) DO NOTHING`,
            [roleId, cap, isGranted]
          );
          permissionsCount++;
        }
      }

      // 3. Secure Initial Super Admin Bootstrap (Only if no Super Admin exists AND env vars are supplied)
      const existingSuperAdmin = await client.query(
        "SELECT id, email FROM users WHERE role_name = 'Super Admin' LIMIT 1"
      );

      if (existingSuperAdmin.rows.length === 0) {
        const emailEnv = process.env.BOOTSTRAP_SUPERADMIN_EMAIL?.toLowerCase().trim();
        const rawPassword = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;
        const name = process.env.BOOTSTRAP_SUPERADMIN_NAME?.trim() || 'Super Admin';

        if (!emailEnv || !rawPassword) {
          logger.warn(
            '⚠️ Initial Super Admin bootstrap skipped: BOOTSTRAP_SUPERADMIN_EMAIL and BOOTSTRAP_SUPERADMIN_PASSWORD must both be provided in environment variables.'
          );
        } else {
          const superAdminRoleId = roleMap.get('Super Admin');
          if (!superAdminRoleId) {
            throw new Error('Super Admin role must exist to bootstrap initial administrator');
          }

          const passwordHash = await PasswordService.hash(rawPassword);

          await client.query(
            `INSERT INTO users (name, email, password_hash, role_id, role_name, status)
             VALUES ($1, $2, $3, $4, 'Super Admin', 'active')
             ON CONFLICT (email) DO NOTHING`,
            [name, emailEnv, passwordHash, superAdminRoleId]
          );

          superAdminBootstrapped = true;
          bootstrapEmail = emailEnv;
          logger.info(`Initial Super Admin bootstrapped safely with identity: ${emailEnv}`);
        }
      }

      // 3b. Ensure all Super Admin accounts remain active
      await client.query("UPDATE users SET status = 'active' WHERE role_name = 'Super Admin' AND status != 'active'");

      // 4. Seed Canonical System Settings if missing (ON CONFLICT DO NOTHING preserves user customizations)
      const settingsCategories = [
        {
          category: 'branding',
          data: {
            applicationName: 'CRM',
            companyName: 'iSysware',
            companyLogo: '/isysware-logo.svg',
            currency: 'PKR',
            currencySymbol: 'Rs.',
            timezone: 'Asia/Karachi (UTC+5)',
          },
        },
        {
          category: 'communication',
          data: {
            staleLeadDays: 7,
            followUpReminderMinutes: 30,
            enableWhatsAppDirect: true,
            enableNotifications: true,
            whatsappGreetingTemplate:
              'Assalam-o-Alaikum {{clientName}}, this is {{repName}} from {{companyName}}. We are following up regarding your inquiry for {{serviceName}}. How can we assist you today?',
          },
        },
        {
          category: 'letterhead',
          data: {
            proposalLetterheadBg: '',
            companyAddress: 'Suite #402, Business Executive Center, Main Shahrah-e-Faisal, Karachi, Pakistan',
            companyTaxId: 'NTN: 8294719-4 | STRN: 3277876123456',
            companyPhone: '+92 300 1234567',
            companyEmail: 'proposals@isysware.com',
            companyWebsite: 'https://isysware.com',
            defaultProposalValidityDays: 14,
            defaultProposalTerms: `1. Validity: This commercial quotation is valid for 14 calendar days from the date of issuance.\n2. Payment Terms: 40% advance milestone on contract signing, 30% on beta milestone preview, and 30% upon final delivery & handover.\n3. Taxes: Quoted prices are in Pakistani Rupees (PKR) and exclusive of applicable provincial sales tax (GST/PST) unless explicitly itemized.\n4. Support & Warranty: 3 months of complimentary technical bug-fixing and cloud maintenance support is included post-launch.\n5. Intellectual Property: Complete source code ownership and database rights will be transferred upon settlement of final invoice.`,
            authorizedSignatureName: 'Abdur Rehman Arain',
            authorizedSignatureTitle: 'Director of Enterprise Solutions',
            authorizedSignatureImg: '',
          },
        },
        {
          category: 'pricing_config',
          data: {
            defaultPricingModel: 'one_time',
          },
        },
      ];

      for (const item of settingsCategories) {
        await client.query(
          `INSERT INTO settings (category, data)
           VALUES ($1, $2::jsonb)
           ON CONFLICT (category) DO NOTHING`,
          [item.category, JSON.stringify(item.data)]
        );
      }
    });

    logger.info(
      `System seeding finished successfully: ${rolesCount} roles verified, ${permissionsCount} capability entries ensured.`
    );

    return {
      rolesCreatedOrFound: rolesCount,
      permissionsSeeded: permissionsCount,
      superAdminBootstrapped,
      bootstrapEmail,
    };
  }
}

// Standalone execution when invoked via CLI
if (require.main === module) {
  DatabaseSeeder.seed()
    .then((res) => {
      logger.info('Seeding execution finished:', res);
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Database seeding failed:', err);
      process.exit(1);
    });
}
