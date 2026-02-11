import React from "react"

export default function CommunityRank({ items }) {
  return (
    <div className="card community">
      <h3>Community Rank</h3>
      <ol>
        {items.map((i, idx) => (
          <li key={idx}>
            <span className="name">{i.name}</span>
            <span className="cscore">{i.score}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
