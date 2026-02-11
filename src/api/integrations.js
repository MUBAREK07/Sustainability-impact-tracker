import client from "./client"

export async function fetchSmartMeter() {
  const res = await client.get("/data/smart-meter")
  return res.data || {}
}

export async function fetchGrocery() {
  const res = await client.get("/data/grocery")
  return res.data || {}
}

export async function fetchTravel() {
  const res = await client.get("/data/travel")
  return res.data || {}
}
