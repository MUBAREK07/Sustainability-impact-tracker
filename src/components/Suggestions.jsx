import React from "react"

export default function Suggestions({ items }) {
  return (
    <div className="card suggestions">
      <h3>Actionable Suggestions</h3>
      <ul>
        {items.map((it) => (
          <li key={it.id} className="suggestion-item">
            <strong>{it.title}</strong>
            <div className="muted">{it.detail}</div>
            <div className="impact">Estimated: {it.impact}kg CO2 / month</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
