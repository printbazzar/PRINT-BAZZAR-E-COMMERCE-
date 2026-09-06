import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function checkRls() {
  console.log('====================================================');
  console.log(' SUPABASE POSTGRESQL ROW LEVEL SECURITY (RLS) AUDIT');
  console.log('====================================================\n');

  try {
    const dbUser = await prisma.$queryRawUnsafe(`
      SELECT usename, usesuper, usebypassrls 
      FROM pg_user 
      WHERE usename = current_user;
    `);
    console.log('Database Connection User Privileges:');
    console.log(dbUser);
    console.log('');
    const tables = await prisma.$queryRawUnsafe(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    console.log(`Auditing ${tables.length} public database tables:\n`);
    
    let enabledCount = 0;
    let disabledCount = 0;

    tables.forEach((t) => {
      if (t.rowsecurity) {
        console.log(`  🔒 [RLS ENABLED]  ${t.tablename}`);
        enabledCount++;
      } else {
        console.log(`  ❌ [RLS DISABLED] ${t.tablename}`);
        disabledCount++;
      }
    });

    console.log(`\nSummary: ${enabledCount} tables have RLS enabled, ${disabledCount} tables have RLS disabled.`);

    const policies = await prisma.$queryRawUnsafe(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);

    console.log(`\nActive RLS Policies Count: ${policies.length}`);
    policies.forEach((pol) => {
      console.log(`  • Table: ${pol.tablename} | Policy: ${pol.policyname} | Action: ${pol.cmd} | Roles: ${pol.roles}`);
    });

  } catch (err) {
    console.error('Error auditing RLS status:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkRls();
