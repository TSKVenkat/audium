import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDatabase, PodcastEpisode } from '@/lib/mongodb'

// GET /api/podcasts - Get user's podcasts
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const db = await getDatabase()

    // MongoDB storage
    const podcastsCollection = db.collection<PodcastEpisode>('podcasts')

    const podcasts = await podcastsCollection
      .find({ userId: user.id })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      podcasts
    })

  } catch (error) {
    console.error('Get podcasts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch podcasts' },
      { status: 500 }
    )
  }
}

// POST /api/podcasts - Create new podcast
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const {
      title,
      description,
      script,
      originalContent,
      inputType,
      metadata,
      sections
    } = await request.json()

    if (!title || !script || !originalContent) {
      return NextResponse.json(
        { error: 'Title, script, and original content are required' },
        { status: 400 }
      )
    }

    const db = await getDatabase()

    // MongoDB storage
    const podcastsCollection = db.collection<PodcastEpisode>('podcasts')

    const newPodcast: PodcastEpisode = {
      userId: user.id,
      title,
      description: description || `Podcast generated from ${inputType}`,
      script,
      originalContent,
      inputType: inputType || 'text',
      metadata: {
        wordCount: script.split(/\s+/).length,
        estimatedDuration: `${Math.ceil(script.split(/\s+/).length / 150)} minutes`,
        style: metadata?.style || 'conversational',
        audience: metadata?.audience || 'general',
        generatedAt: new Date()
      },
      sections: sections || [],
      status: 'completed',
      analytics: {
        plays: 0,
        downloads: 0,
        shares: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await podcastsCollection.insertOne(newPodcast)

    return NextResponse.json({
      success: true,
      podcast: {
        ...newPodcast,
        _id: result.insertedId.toString()
      }
    })

  } catch (error) {
    console.error('Create podcast error:', error)
    return NextResponse.json(
      { error: 'Failed to create podcast' },
      { status: 500 }
    )
  }
}