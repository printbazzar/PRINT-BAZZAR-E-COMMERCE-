import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// PHASE 3 — Complete Department RBAC.
// Adds the four missing organizational roles (Manager, Sales, Accounts,
// Dispatch) on top of the existing Role / Permission / RolePermission
// architecture — the same pattern already used by seedFrontOfficeRole.js.
//
// No new Prisma models or schema changes. Permission codes are reused
// wherever they already exist (findUnique by code before create), so this
// script does not create duplicate permissions across roles.
// Idempotent: safe to run more than once.
//
// This script only seeds Role/Permission/RolePermission rows. It does NOT
// create any staff User accounts.
const ROLE_DEFINITIONS = [
  {
    name: 'MANAGER',
    description: 'General Manager / Admin — broad operational read access across reports, orders, customers, and staff management.',
    permissions: [
      { code: 'REPORT_VIEW', module: 'Analytics', description: 'View daily closing and sales reports' },
      { code: 'ORDER_VIEW', module: 'Orders', description: 'View customer orders' },
      { code: 'CUSTOMER_VIEW', module: 'CRM', description: 'View and search customers' },
      { code: 'USER_MANAGE', module: 'Staff', description: 'Create, edit and deactivate staff accounts' },
    ],
  },
  {
    name: 'SALES',
    description: 'Sales & Business Development — customers, orders, catalogue viewing, and quotation handling.',
    permissions: [
      { code: 'CUSTOMER_VIEW', module: 'CRM', description: 'View and search customers' },
      { code: 'ORDER_VIEW', module: 'Orders', description: 'View customer orders' },
      { code: 'ORDER_UPDATE', module: 'Orders', description: 'Create and update orders' },
      { code: 'PRODUCT_VIEW', module: 'Catalog', description: 'View products and catalog' },
    ],
  },
  {
    name: 'ACCOUNTS',
    description: 'Accounts & Finance — order, payment, invoice and report related read access.',
    permissions: [
      { code: 'ORDER_VIEW', module: 'Orders', description: 'View customer orders' },
      { code: 'REPORT_VIEW', module: 'Analytics', description: 'View daily closing and sales reports' },
    ],
  },
  {
    name: 'DISPATCH',
    description: 'Dispatch Coordination — order viewing and status/logistics updates for delivery and dispatch.',
    permissions: [
      { code: 'ORDER_VIEW', module: 'Orders', description: 'View customer orders' },
      { code: 'ORDER_UPDATE', module: 'Orders', description: 'Create and update orders' },
    ],
  },
];

async function main() {
  console.log('Seeding department roles: MANAGER, SALES, ACCOUNTS, DISPATCH...');

  for (const def of ROLE_DEFINITIONS) {
    let role = await prisma.role.findUnique({ where: { name: def.name } });
    if (!role) {
      role = await prisma.role.create({
        data: { name: def.name, description: def.description, isSystem: true },
      });
      console.log(`Created role: ${def.name} (${role.id})`);
    } else {
      console.log(`Role already exists: ${def.name} (${role.id})`);
    }

    for (const p of def.permissions) {
      let perm = await prisma.permission.findUnique({ where: { code: p.code } });
      if (!perm) {
        perm = await prisma.permission.create({ data: p });
        console.log(`Created permission: ${p.code}`);
      }

      const link = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
      });
      if (!link) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: perm.id },
        });
        console.log(`Linked ${p.code} to ${def.name}`);
      }
    }
  }

  console.log('Department role seeding complete!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
