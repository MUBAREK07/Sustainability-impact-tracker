import React from "react"
import { Link } from "react-router-dom"

export default function Header() {
  const user = typeof window !== "undefined" ? localStorage.getItem("user") : null
  return (
    <header className="header">
      <div className="container header-inner">
        <div>
          <h1>Sustainability Impact Tracker</h1>
          <p className="tag">Your personalized Eco-Credit Score & insights</p>
        </div>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/settings">Settings</Link>
          {user ? <span className="user">Hi, {user}</span> : <Link to="/login">Log in</Link>}
        </nav>
      </div>
    </header>
  )
}
