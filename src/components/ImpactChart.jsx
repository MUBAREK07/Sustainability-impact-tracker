import React, { useState, useMemo } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Bar } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function ImpactChart({ breakdown = { home: 0, food: 0, travel: 0 } }) {
  const labels = ["Home", "Food", "Travel"]
  const values = [breakdown.home, breakdown.food, breakdown.travel]
  const [selected, setSelected] = useState(null)

  const data = useMemo(() => ({
    labels,
    datasets: [
      {
        label: "Impact (score units)",
        data: values,
        backgroundColor: ["#2b9f6a", "#60a5fa", "#f59e0b"],
      },
    ],
  }), [labels.join("|"), values.join(",")])

  const options = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      title: { display: false },
      tooltip: { enabled: true },
    },
    onClick: (evt, elements) => {
      if (!elements.length) return
      const idx = elements[0].index
      setSelected({ label: labels[idx], value: values[idx] })
    },
  }), [labels, values])

  return (
    <div className="card chartcard">
      <h3>Impact Breakdown</h3>
      <Bar data={data} options={options} />
      {selected ? (
        <div style={{ marginTop: 10 }}>
          <strong>{selected.label}</strong>: {selected.value} (click another bar to change)
        </div>
      ) : (
        <div style={{ marginTop: 10 }} className="muted">Click a bar to see details</div>
      )}
    </div>
  )
}
