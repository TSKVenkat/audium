import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDatabase } from '@/lib/mongodb'

// Clean up test data and fake analytics
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDatabase()
    const podcastsCollection = db.collection('podcasts')

    // Delete all test episodes
    const result = await podcastsCollection.deleteMany({
      userId: user.id,
      $or: [
        { title: { $regex: /^Test Episode/ } },
        { description: 'Generated for analytics testing' },
        { script: 'This is a test episode for analytics verification.' }
      ]
    })

    console.log(`🧹 Cleaned up ${result.deletedCount} test episodes`)

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

