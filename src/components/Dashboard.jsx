import React, { useState, useEffect } from "react"
import ScoreCard from "./ScoreCard.jsx"
import Suggestions from "./Suggestions.jsx"
import CommunityRank from "./CommunityRank.jsx"
import ImpactChart from "./ImpactChart.jsx"
import { fetchSmartMeter, fetchGrocery, fetchTravel } from "../api/integrations"

const mock = {
  score: 732,
  breakdown: { home: 320, food: 210, travel: 202 },
  suggestions: [
    { id: 1, title: "Switch to local milk brand", detail: "Saves ~10kg CO2/month", impact: 10 },
    { id: 2, title: "Replace incandescent bulbs", detail: "Saves ~4kg CO2/month", impact: 4 },
    { id: 3, title: "Use public transit twice weekly", detail: "Saves ~6kg CO2/month", impact: 6 }
  ],
  community: [
    { name: "Average Neighbour", score: 640 },
    { name: "Top Local", score: 880 },
    { name: "You", score: 732 }
  ]
}

export default function Dashboard() {
  const [data, setData] = useState(mock)
  const [loading, setLoading] = useState(false)

  async function refreshIntegrations() {
    setLoading(true)
    try {
      const [sm, gr, tr] = await Promise.all([fetchSmartMeter(), fetchGrocery(), fetchTravel()])
      // merge returned impacts into current breakdown and suggestions
      const next = { ...data }
      next.breakdown = {
        home: sm.impact || data.breakdown.home,
        food: gr.impact || data.breakdown.food,
        travel: tr.impact || data.breakdown.travel,
      }
      setData(next)
    } catch (e) {
      console.error("Failed to fetch integrations", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // attempt to fetch integrations once on mount
    refreshIntegrations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <section className="dashboard container">
      <div className="left">
        <ImpactChart breakdown={data.breakdown} />
        <ScoreCard score={data.score} breakdown={data.breakdown} />
        <Suggestions items={data.suggestions} />
        <div style={{ marginBottom: 12 }}>
          <button onClick={refreshIntegrations} disabled={loading}>{loading ? "Refreshing..." : "Refresh integrations"}</button>
        </div>
      </div>
      <aside className="right">
        <CommunityRank items={data.community} />
      </aside>
    </section>
  )
}
