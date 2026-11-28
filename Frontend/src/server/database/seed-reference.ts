import { withTransaction } from './connection';
import { logger } from '../utils/logger';

/**
 * Reference Catalog Seeder
 * 
 * Enforces Zero-Demo Rule:
 * In normal/production mode, operational master records (Teams, Services, Pricing Models, Lead Sources)
 * are left empty to be configured dynamically by organizational administrators via the CRM UI.
 * 
 * Demo reference data is only seeded if explicitly enabled via SEED_DEMO_REFERENCE=true in non-production environments.
 */
export async function seedReferenceData() {
  if (process.env.SEED_DEMO_REFERENCE !== 'true') {
    logger.info('Reference catalogs left clean for dynamic administrator configuration. Zero demo data seeded.');
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SECURITY: Demo reference data cannot be seeded in production.');
  }

  logger.warn('⚠️ Seeding optional development reference catalog data (non-production)...');

  await withTransaction(async (client) => {
    // 1. Teams
    const teamsData = [
      { name: 'Alpha Sales Unit', code: 'ALPHA', desc: 'Direct corporate sales and enterprise prospecting.' },
      { name: 'Enterprise Solutions', code: 'ENTERPRISE', desc: 'Key account management and customized software delivery.' },
      { name: 'Retail & POS Team', code: 'RETAIL', desc: 'Retail outlets, salon POS and commercial hardware sales.' }
    ];
    for (const t of teamsData) {
      await client.query(
        `INSERT INTO teams (name, code, description, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (code) DO NOTHING`,
        [t.name, t.code, t.desc]
      );
    }

    // 2. Pricing Models
    const pmData = [
      { name: 'Monthly Subscription (SaaS)', billingType: 'Recurring', desc: 'Standard monthly subscription billed on periodic frequency', isDefault: true },
      { name: 'One-Time Project Model', billingType: 'Fixed', desc: 'Lump-sum project quotation with advance and milestone disbursements', isDefault: false },
      { name: 'Ownership / Perpetual License', billingType: 'Fixed', desc: 'Lifetime license acquisition with optional annual maintenance', isDefault: false },
      { name: 'Hybrid Milestone & Maintenance', billingType: 'Milestone', desc: 'Split setup and delivery milestones followed by recurring support', isDefault: false }
    ];
    for (const pm of pmData) {
      await client.query(
        `INSERT INTO pricing_models (name, billing_type, description, is_default, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (name) DO NOTHING`,
        [pm.name, pm.billingType, pm.desc, pm.isDefault]
      );
    }

    // 3. Lead Sources
    const sourcesData = [
      'Meta Ads', 'Google Ads', 'WhatsApp', 'Call', 'Website', 'Referral', 'Existing Client', 'Walk-in', 'Other'
    ];
    for (const s of sourcesData) {
      await client.query(
        `INSERT INTO lead_sources (name, is_active)
         VALUES ($1, true)
         ON CONFLICT (name) DO NOTHING`,
        [s]
      );
    }

    // 4. Services
    const srvData = [
      { name: 'Salon Management System', category: 'ERP', price: 85000, desc: 'Complete appointment, inventory and staff payroll system for modern salons.' },
      { name: 'Gym & Fitness ERP', category: 'ERP', price: 65000, desc: 'Membership attendance, biometric access control and personal training schedule.' },
      { name: 'Real Estate CRM', category: 'CRM', price: 120000, desc: 'Property inventory, buyer pipeline and commission tracking platform.' },
      { name: 'Restaurant POS & Inventory', category: 'POS', price: 95000, desc: 'Kitchen display system, split billing and recipe-level inventory control.' },
      { name: 'Custom Enterprise Web Portal', category: 'Custom', price: 250000, desc: 'Tailored enterprise web applications built with Next.js and secure APIs.' },
      { name: 'E-Commerce Multi-Vendor Engine', category: 'E-Commerce', price: 180000, desc: 'Scalable multi-vendor marketplace with automated payouts.' }
    ];
    for (const srv of srvData) {
      await client.query(
        `INSERT INTO services (name, category, default_price_pkr, description, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (name) DO NOTHING`,
        [srv.name, srv.category, srv.price, srv.desc]
      );
    }
  });

  logger.info('Reference catalog data seeded successfully.');
}

// Standalone execution
if (require.main === module) {
  seedReferenceData()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Reference data seeding failed:', err);
      process.exit(1);
    });
}
