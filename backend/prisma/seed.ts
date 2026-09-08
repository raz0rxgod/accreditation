import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const COUNTRIES: Array<{ name: string; isoCode: string }> = [
  { name: 'Россия', isoCode: 'RU' },
  { name: 'Турция', isoCode: 'TR' },
  { name: 'Германия', isoCode: 'DE' },
  { name: 'Франция', isoCode: 'FR' },
  { name: 'Италия', isoCode: 'IT' },
  { name: 'Испания', isoCode: 'ES' },
  { name: 'Великобритания', isoCode: 'GB' },
  { name: 'США', isoCode: 'US' },
  { name: 'Китай', isoCode: 'CN' },
  { name: 'Япония', isoCode: 'JP' },
  { name: 'Индия', isoCode: 'IN' },
  { name: 'Сербия', isoCode: 'RS' },
  { name: 'Армения', isoCode: 'AM' },
  { name: 'Беларусь', isoCode: 'BY' },
  { name: 'Казахстан', isoCode: 'KZ' },
  { name: 'Грузия', isoCode: 'GE' },
  { name: 'ОАЭ', isoCode: 'AE' },
  { name: 'Египет', isoCode: 'EG' },
  { name: 'Иран', isoCode: 'IR' },
  { name: 'Абхазия', isoCode: 'AB' },
];

async function seedCountries() {
  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { isoCode: country.isoCode },
      update: {},
      create: country,
    });
  }
  console.log(`Справочник стран заполнен (${COUNTRIES.length} записей).`);
}

async function main() {
  await seedCountries();

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@mfa.gov';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  const existing = await prisma.staffUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Сотрудник ${email} уже существует, пропускаю создание.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.staffUser.create({
    data: {
      email,
      passwordHash,
      fullName: 'Администратор системы',
      role: 'admin',
      active: true,
    },
  });

  console.log('Создан первый администратор:');
  console.log(`  email: ${admin.email}`);
  console.log(`  пароль: ${password} (обязательно смените после первого входа)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
