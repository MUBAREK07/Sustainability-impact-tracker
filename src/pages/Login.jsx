import React, { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function Login() {
  const [name, setName] = useState("")
  const navigate = useNavigate()

  function submit(e) {
    e.preventDefault()
    if (!name) return
    localStorage.setItem("user", name)
    navigate("/")
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Log in</h2>
        <form onSubmit={submit}>
          <label>
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
          </label>
          <div style={{ marginTop: 12 }}>
            <button type="submit">Sign in</button>
          </div>
        </form>
      </div>
    </div>
  )
}
