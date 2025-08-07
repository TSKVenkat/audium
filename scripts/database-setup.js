#!/usr/bin/env node

const { MongoClient } = require('mongodb')

// Enhanced database setup script with all optimizations
async function setupProductionDatabase() {
  console.log('🚀 Setting up production-ready MongoDB database...')
  
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
  const dbName = process.env.MONGODB_DB_NAME || 'audium-ai'
  
  const client = new MongoClient(uri, {
    maxPoolSize: 50,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
    retryReads: true,
    writeConcern: { w: 'majority', j: true }
  })
  
  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db(dbName)
    
    // 1. CREATE OPTIMIZED INDEXES
    console.log('\n📊 Creating optimized indexes...')
    await createAllIndexes(db)
    
    // 2. SETUP TTL COLLECTIONS
    console.log('\n⏰ Setting up TTL collections...')
    await setupTTLCollections(db)
    
    // 3. CONFIGURE SHARDING (if available)
    console.log('\n🔧 Configuring sharding...')
    await configureSharding(db)
    
    // 4. PRODUCTION SETUP - NO SAMPLE DATA
    console.log('\n🏗️ Production database ready - no sample data created')
    
    // 5. VERIFY SETUP
    console.log('\n✅ Verifying database setup...')
    await verifySetup(db)
    
    console.log('\n🎉 Database setup completed successfully!')
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  } finally {
    await client.close()
  }
}

async function createAllIndexes(db) {
  const indexOperations = [
    // USERS COLLECTION
    {
      collection: 'users',
      indexes: [
        { spec: { email: 1 }, options: { unique: true, background: true } },
        { spec: { plan: 1, joinedAt: -1 }, options: { background: true } },
        { spec: { 'usage.lastReset': 1, plan: 1 }, options: { background: true } },
        { spec: { stripeCustomerId: 1 }, options: { background: true, sparse: true } }
      ]
    },
    
    // PODCASTS COLLECTION
    {
      collection: 'podcasts',
      indexes: [
        { spec: { userId: 1, createdAt: -1 }, options: { background: true } },
        { spec: { userId: 1, status: 1, createdAt: -1 }, options: { background: true } },
        { spec: { 'analytics.plays': -1, createdAt: -1 }, options: { background: true } },
        { spec: { inputType: 1, createdAt: -1 }, options: { background: true } },
        { 
          spec: { title: 'text', description: 'text', originalContent: 'text' }, 
          options: { 
            background: true,
            weights: { title: 10, description: 5, originalContent: 1 }
          }
        },
        { 
          spec: { userId: 1, status: 1, 'analytics.plays': -1, createdAt: -1 }, 
          options: { background: true }
        }
      ]
    },
    
    // API USAGE COLLECTION
    {
      collection: 'apiUsage',
      indexes: [
        { spec: { userId: 1, requestTime: -1 }, options: { background: true } },
        { spec: { endpoint: 1, requestTime: -1 }, options: { background: true } },
        { spec: { requestTime: 1 }, options: { expireAfterSeconds: 7776000, background: true } },
        { spec: { userId: 1, requestTime: 1, endpoint: 1 }, options: { background: true } }
      ]
    }
  ]
  
  for (const { collection, indexes } of indexOperations) {
    console.log(`  📋 Creating indexes for ${collection}...`)
    const coll = db.collection(collection)
    
    for (const { spec, options } of indexes) {
      try {
        await coll.createIndex(spec, options)
        console.log(`    ✅ Index created: ${JSON.stringify(spec)}`)
      } catch (error) {
        console.log(`    ⚠️  Index may already exist: ${JSON.stringify(spec)}`)
      }
    }
  }
}

async function setupTTLCollections(db) {
  const ttlCollections = [
    { name: 'tempFiles', ttl: 86400, field: 'createdAt' }, // 24 hours
    { name: 'sessions', ttl: 604800, field: 'createdAt' }, // 7 days
    { name: 'analyticsCache', ttl: 3600, field: 'updatedAt' }, // 1 hour
    { name: 'rateLimits', ttl: 900, field: 'resetTime' }, // 15 minutes
    { name: 'failedJobs', ttl: 172800, field: 'failedAt' }, // 48 hours
    { name: 'emailVerifications', ttl: 86400, field: 'createdAt' }, // 24 hours
    { name: 'passwordResets', ttl: 3600, field: 'createdAt' }, // 1 hour
    { name: 'processingQueue', ttl: 21600, field: 'createdAt' }, // 6 hours
    { name: 'webhookLogs', ttl: 2592000, field: 'timestamp' } // 30 days
  ]
  
  for (const { name, ttl, field } of ttlCollections) {
    try {
      const collection = db.collection(name)
      await collection.createIndex(
        { [field]: 1 },
        { 
          expireAfterSeconds: ttl,
          background: true,
          name: `${name}_ttl_${ttl}s`
        }
      )
      console.log(`  ⏰ TTL index created for ${name}: ${ttl}s`)
    } catch (error) {
      console.log(`  ⚠️  TTL index for ${name} may already exist`)
    }
  }
}

async function configureSharding(db) {
  try {
    // Enable sharding on database
    await db.admin().command({ enableSharding: 'audium-ai' })
    console.log('  🔧 Sharding enabled on audium-ai database')
    
    // Configure shard keys
    const shardConfigs = [
      { collection: 'audium-ai.users', key: { _id: 'hashed' } },
      { collection: 'audium-ai.podcasts', key: { userId: 1, createdAt: 1 } },
      { collection: 'audium-ai.apiUsage', key: { userId: 1, requestTime: 1 } }
    ]
    
    for (const { collection, key } of shardConfigs) {
      try {
        await db.admin().command({ shardCollection: collection, key })
        console.log(`  🎯 Shard key configured for ${collection}`)
      } catch (error) {
        console.log(`  ℹ️  Sharding for ${collection} requires cluster setup`)
      }
    }
    
  } catch (error) {
    console.log('  ℹ️  Sharding configuration requires MongoDB cluster')
  }
}



async function verifySetup(db) {
  const collections = ['users', 'podcasts', 'apiUsage', 'tempFiles', 'sessions']
  
  for (const collectionName of collections) {
    const collection = db.collection(collectionName)
    const indexes = await collection.indexes()
    const count = await collection.countDocuments()
    
    console.log(`  ✅ ${collectionName}: ${indexes.length} indexes, ${count} documents`)
  }
  
  // Test aggregation pipeline
  const podcastsCollection = db.collection('podcasts')
  const aggregationResult = await podcastsCollection.aggregate([
    { $group: { _id: '$inputType', count: { $sum: 1 } } }
  ]).toArray()
  
  console.log('  📊 Aggregation test successful:', aggregationResult)
}

// Run setup if called directly
if (require.main === module) {
  setupProductionDatabase().catch(console.error)
}

module.exports = { setupProductionDatabase }