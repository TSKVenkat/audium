import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDatabase } from '@/lib/mongodb'

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
    // MongoDB storage only - no fallback bullshit
    const podcastsCollection = db.collection('podcasts')

    // Aggregate analytics data
    // 📊 REAL ANALYTICS AGGREGATION - No Mock Data
    const analyticsData = await podcastsCollection.aggregate([
      { $match: { userId: user.id } },
      {
        $group: {
          _id: null,
          totalEpisodes: { $sum: 1 },
          totalPlays: { $sum: { $ifNull: ['$analytics.plays', 0] } },
          totalDownloads: { $sum: { $ifNull: ['$analytics.downloads', 0] } },
          totalShares: { $sum: { $ifNull: ['$analytics.shares', 0] } },
          totalWordCount: { $sum: { $ifNull: ['$metadata.wordCount', 0] } },
          avgWordCount: { $avg: { $ifNull: ['$metadata.wordCount', 0] } },
          episodesByInputType: {
            $push: {
              inputType: '$inputType',
              createdAt: '$createdAt',
              title: '$title',
              plays: { $ifNull: ['$analytics.plays', 0] },
              downloads: { $ifNull: ['$analytics.downloads', 0] },
              shares: { $ifNull: ['$analytics.shares', 0] }
            }
          }
        }
      }
    ]).toArray()

    const stats = analyticsData[0] || {
      totalEpisodes: 0,
      totalPlays: 0,
      totalDownloads: 0,
      totalShares: 0,
      totalWordCount: 0,
      avgWordCount: 0,
      episodesByInputType: []
    }

    // Get recent episodes for timeline
    const recentEpisodes = await podcastsCollection
      .find({ userId: user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .project({
        title: 1,
        createdAt: 1,
        'analytics.plays': 1,
        'analytics.downloads': 1,
        'metadata.wordCount': 1
      })
      .toArray()

    // Calculate growth metrics (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const [recentStats, previousStats] = await Promise.all([
      podcastsCollection.aggregate([
        { $match: { userId: user.id, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: null,
            episodeCount: { $sum: 1 },
            totalWordCount: { $sum: '$metadata.wordCount' }
          }
        }
      ]).toArray(),
      podcastsCollection.aggregate([
        { 
          $match: { 
            userId: user.id, 
            createdAt: { 
              $gte: sixtyDaysAgo, 
              $lt: thirtyDaysAgo 
            } 
          } 
        },
        {
          $group: {
            _id: null,
            episodeCount: { $sum: 1 },
            totalWordCount: { $sum: '$metadata.wordCount' }
          }
        }
      ]).toArray()
    ])

    const recentCount = recentStats[0]?.episodeCount || 0
    const previousCount = previousStats[0]?.episodeCount || 0
    const recentWords = recentStats[0]?.totalWordCount || 0
    const previousWords = previousStats[0]?.totalWordCount || 0

    const episodeGrowth = previousCount === 0 ? 100 : 
      Math.round(((recentCount - previousCount) / previousCount) * 100)
    
    const wordGrowth = previousWords === 0 ? 100 : 
      Math.round(((recentWords - previousWords) / previousWords) * 100)

    // Input type distribution
    const inputTypeStats = stats.episodesByInputType.reduce((acc: any, episode: any) => {
      acc[episode.inputType] = (acc[episode.inputType] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalEpisodes: stats.totalEpisodes,
          totalPlays: stats.totalPlays,
          totalDownloads: stats.totalDownloads,
          totalShares: stats.totalShares,
          totalWords: stats.totalWordCount,
          avgWordsPerEpisode: Math.round(stats.avgWordCount || 0)
        },
        growth: {
          episodeGrowth: `${episodeGrowth >= 0 ? '+' : ''}${episodeGrowth}%`,
          wordGrowth: `${wordGrowth >= 0 ? '+' : ''}${wordGrowth}%`,
          recentEpisodes: recentCount,
          recentWords: recentWords
        },
        distribution: {
          inputTypes: inputTypeStats
        },
        recentActivity: recentEpisodes
      }
    })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}