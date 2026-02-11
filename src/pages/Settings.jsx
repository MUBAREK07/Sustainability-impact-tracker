import React, { useState, useEffect } from "react"

export default function Settings() {
  const [integrations, setIntegrations] = useState({ smartMeter: true, grocery: false, travel: false })

  useEffect(() => {
    const stored = localStorage.getItem("sustainability_settings")
    if (stored) setIntegrations(JSON.parse(stored))
  }, [])

  function toggle(k) {
    const next = { ...integrations, [k]: !integrations[k] }
    setIntegrations(next)
    localStorage.setItem("sustainability_settings", JSON.stringify(next))
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Settings</h2>
        <p>Enable or disable integrations used to compute your Eco-Credit Score.</p>
        <ul className="settings-list">
          <li>
            <label>
              <input type="checkbox" checked={integrations.smartMeter} onChange={() => toggle("smartMeter")} /> Smart Home Meter
            </label>
          </li>
          <li>
            <label>
              <input type="checkbox" checked={integrations.grocery} onChange={() => toggle("grocery")} /> Grocery App
            </label>
          </li>
          <li>
            <label>
              <input type="checkbox" checked={integrations.travel} onChange={() => toggle("travel")} /> Travel History
            </label>
          </li>
        </ul>
      </div>
    </div>
  )
}
