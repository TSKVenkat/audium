import { getUserFromRequest } from '@/lib/auth'
import { getDatabase, PodcastEpisode } from '@/lib/mongodb'
import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid podcast ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const podcastsCollection = db.collection<PodcastEpisode>('podcasts')
    
    const podcast = await podcastsCollection.findOne({ 
      _id: new ObjectId(id) as any,
      userId: user.id 
    })
    
    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      podcast: {
        ...podcast,
        _id: podcast._id.toString()
      }
    })

  } catch (error) {
    console.error('Error fetching podcast:', error)
    return NextResponse.json(
      { error: 'Failed to fetch podcast' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid podcast ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { title, description, script } = body

    const db = await getDatabase()
    const podcastsCollection = db.collection<PodcastEpisode>('podcasts')

    const updateData: any = {
      updatedAt: new Date()
    }

    if (title) updateData.title = title
    if (description) updateData.description = description
    if (script) {
      updateData.script = script
      updateData['metadata.wordCount'] = script.split(/\s+/).length
      updateData['metadata.estimatedDuration'] = `${Math.ceil(script.split(/\s+/).length / 150)} minutes`
    }

    const result = await podcastsCollection.updateOne(
      { _id: new ObjectId(id) as any, userId: user.id },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Podcast updated successfully'
    })

  } catch (error) {
    console.error('Error updating podcast:', error)
    return NextResponse.json(
      { error: 'Failed to update podcast' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid podcast ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const podcastsCollection = db.collection<PodcastEpisode>('podcasts')

    const result = await podcastsCollection.deleteOne({
      _id: new ObjectId(id) as any,
      userId: user.id
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      )
    }

    console.log('✅ Deleted podcast from MongoDB:', id)
    return NextResponse.json({
      success: true,
      message: 'Podcast deleted successfully'
    })

  } catch (error) {
    console.error('❌ Error deleting podcast:', error)
    return NextResponse.json(
      { error: 'Failed to delete podcast' },
      { status: 500 }
    )
  }
}