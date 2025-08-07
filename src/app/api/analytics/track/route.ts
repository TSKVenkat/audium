import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDatabase } from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action, podcastTitle, timestamp } = await request.json()

    if (!action || !['play', 'download', 'share'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const podcastsCollection = db.collection('podcasts')
    const analyticsCollection = db.collection('analytics_events')

    // Find podcast by title and user
    const podcast = await podcastsCollection.findOne({
      userId: user.id,
      title: podcastTitle
    })

    if (!podcast) {
      // If podcast doesn't exist, create a quick entry for analytics
      const newPodcast = {
        userId: user.id,
        title: podcastTitle || 'Generated Podcast',
        description: 'Podcast generated via Audium',
        script: '',
        inputType: 'unknown',
        originalContent: '',
        metadata: {
          wordCount: 0,
          estimatedDuration: '0:00',
          style: 'conversational',
          audience: 'general',
          generatedAt: new Date()
        },
        sections: [],
        status: 'completed',
        analytics: {
          plays: action === 'play' ? 1 : 0,
          downloads: action === 'download' ? 1 : 0,
          shares: action === 'share' ? 1 : 0,
          lastPlayedAt: action === 'play' ? new Date() : undefined
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await podcastsCollection.insertOne(newPodcast)
      console.log('📊 Created new podcast for analytics:', result.insertedId)
    } else {
      // Update existing podcast analytics
      const updateField = action === 'play' ? 'analytics.plays' : 
                          action === 'download' ? 'analytics.downloads' : 
                          'analytics.shares'

      const updateData: any = {
        $inc: { [updateField]: 1 },
        $set: { 'updatedAt': new Date() }
      }

      if (action === 'play') {
        updateData.$set['analytics.lastPlayedAt'] = new Date()
      }

      await podcastsCollection.updateOne(
        { _id: podcast._id },
        updateData
      )
      console.log(`📊 Updated ${action} analytics for podcast:`, podcast.title)
    }

    // Store individual analytics event
    await analyticsCollection.insertOne({
      userId: user.id,
      podcastId: podcast?._id,
      podcastTitle,
      action,
      timestamp: new Date(timestamp || Date.now()),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({
      success: true,
      message: `${action} tracked successfully`
    })

  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track analytics' },
      { status: 500 }
    )
  }
}
