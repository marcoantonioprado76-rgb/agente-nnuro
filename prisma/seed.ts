import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (existing) {
    console.log('Usuario root ya existe.')
    return
  }

  const passwordHash = await bcrypt.hash('Admin1234', 12)

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@mlmplatform.com',
      passwordHash,
      fullName: 'Administrador',
      country: 'Bolivia',
      city: 'La Paz',
      identityDocument: '00000000',
      dateOfBirth: new Date('1990-01-01'),
      isActive: true,
    },
  })

  console.log('Usuario root creado exitosamente:')
  console.log('  Username: admin')
  console.log('  Password: Admin1234')
  console.log('  ID:', admin.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
