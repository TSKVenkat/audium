import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'

// ADMIN CLEANUP - Remove all test data (no auth required for cleanup)
// This endpoint is for development cleanup only
export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  try {
    const db = await getDatabase()
    const podcastsCollection = db.collection('podcasts')

    // Delete test episodes in development only
    const result = await podcastsCollection.deleteMany({
      $or: [
        { title: { $regex: /^Test Episode/ } },
        { description: 'Generated for analytics testing' },
        { inputType: 'unknown' }
      ]
    })

    console.log(`🧹 DEV CLEANUP: Removed ${result.deletedCount} test episodes`)

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} test episodes`,
      deletedCount: result.deletedCount
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: 'Failed to cleanup test data' }, { status: 500 })
  }
}
