import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import prisma from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  const email = 'test@example.com'
  const password = 'password123'
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword, // Reset password back to default for testing
    },
    create: {
      email,
      password: hashedPassword,
      full_name: 'Test Dummy User',
    },
  })
  console.log(`✅ User ensured: ${user.email} (Password: ${password})`)

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'test-workspace' },
    update: {},
    create: {
      name: 'Test Workspace',
      slug: 'test-workspace',
      created_by: user.id,
      api_limit_usd: 100,
    }
  })
  console.log(`✅ Workspace ensured: ${workspace.name}`)

  const role = await prisma.userWorkspaceRole.upsert({
    where: {
      workspace_id_user_id: {
        workspace_id: workspace.id,
        user_id: user.id,
      }
    },
    update: { role: 'admin' },
    create: {
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'admin'
    }
  })
  console.log(`✅ User linked to Workspace as Admin`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
