import React from "react"

export default function ScoreCard({ score, breakdown }) {
  return (
    <div className="card scorecard">
      <h2>Eco-Credit Score</h2>
      <div className="score">{score}</div>
      <div className="breakdown">
        <div>Home: {breakdown.home}</div>
        <div>Food: {breakdown.food}</div>
        <div>Travel: {breakdown.travel}</div>
      </div>
    </div>
  )
}
