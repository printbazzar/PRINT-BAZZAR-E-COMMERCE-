import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FRONT_OFFICE role and permissions...');

  let role = await prisma.role.findUnique({
    where: { name: 'FRONT_OFFICE' },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        name: 'FRONT_OFFICE',
        description: 'Front Office Counter Staff & Walk-in Store Operations',
        isSystem: true,
      },
    });
    console.log('Created FRONT_OFFICE role:', role.id);
  } else {
    console.log('FRONT_OFFICE role already exists:', role.id);
  }

  // Ensure relevant permissions exist
  const desiredPermissions = [
    { code: 'CUSTOMER_VIEW', module: 'CRM', description: 'View and search customers' },
    { code: 'ORDER_VIEW', module: 'Orders', description: 'View customer orders' },
    { code: 'ORDER_UPDATE', module: 'Orders', description: 'Create and update orders' },
    { code: 'PRODUCT_VIEW', module: 'Catalog', description: 'View products and catalog' },
    { code: 'REPORT_VIEW', module: 'Analytics', description: 'View daily closing and sales reports' },
  ];

  for (const p of desiredPermissions) {
    let perm = await prisma.permission.findUnique({ where: { code: p.code } });
    if (!perm) {
      perm = await prisma.permission.create({ data: p });
      console.log('Created permission:', p.code);
    }
    // Link permission to role
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
        data: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
      console.log(`Linked ${p.code} to FRONT_OFFICE`);
    }
  }

  console.log('FRONT_OFFICE role seeding complete!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
