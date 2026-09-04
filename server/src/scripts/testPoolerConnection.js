import { PrismaClient } from '@prisma/client';

const regions = ['ap-south-1', 'ap-southeast-1', 'us-east-1', 'us-west-1', 'eu-central-1'];
const password = 'OPENSUPABASE';
const projectRef = 'uigpizwsjtpecaduampi';

async function testConnections() {
  console.log('Testing Supabase IPv4 Pooler connection with Prisma...\n');

  for (const region of regions) {
    for (const port of [6543, 5432]) {
      const host = `aws-0-${region}.pooler.supabase.com`;
      const user = `postgres.${projectRef}`;
      const url = `postgresql://${user}:${password}@${host}:${port}/postgres?pgbouncer=true&connection_limit=1`;

      console.log(`Testing ${region} on port ${port}...`);
      const prisma = new PrismaClient({
        datasources: { db: { url } },
      });

      try {
        const count = await prisma.category.count();
        console.log(`\n🎉 SUCCESS! Connected to ${region} on port ${port}! Category count:`, count);
        console.log('Working Connection String:', url);
        await prisma.$disconnect();
        return;
      } catch (err) {
        console.log(`  Failed (${region}:${port}):`, err.message?.split('\n')[0]);
        await prisma.$disconnect();
      }
    }
  }
}

testConnections();
