const { setupProductionDatabase } = require('./database-setup')

// Enhanced seed script that uses the production setup
async function seedDatabase() {
  console.log('🌱 Seeding database with production setup...')
  
  try {
    await setupProductionDatabase()
    console.log('✅ Database seeding completed with full production optimizations!')
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
}

module.exports = { seedDatabase }