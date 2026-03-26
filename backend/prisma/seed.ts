import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    const adminPassword = await bcrypt.hash('Admin1234', 10);

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: { name: 'Administrator', username: 'admin', password: adminPassword, role: Role.ADMIN },
    });

    console.log('✅ Admin user created:', admin.username);
    console.log('🎉 Database seed completed!');
    console.log('\n🔑 Default credentials:');
    console.log('   Admin: admin / Admin1234');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
