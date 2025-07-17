// Fetch the CSV data to use in our charts
const csvUrls = {
  wrRankings:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fantasy_tier_rankings_WR-lqEchvM6RlDjUhMXlPwztwjVgpiGZo.csv",
  draftAnalysis:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/draft_round_prospect_tier_analysis-GMTcjYmc0WkWjfvKxZpnIwL11OvaUK.csv",
}

async function fetchCSVData(url) {
  try {
    const response = await fetch(url)
    const csvText = await response.text()

    // Simple CSV parser
    const lines = csvText.trim().split("\n")
    const headers = lines[0].split(",")
    const data = lines.slice(1).map((line) => {
      const values = line.split(",")
      const obj = {}
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim()
      })
      return obj
    })

    return data
  } catch (error) {
    console.error("Error fetching CSV:", error)
    return []
  }
}

// Fetch WR rankings data
fetchCSVData(csvUrls.wrRankings).then((data) => {
  console.log("WR Rankings Sample:", data.slice(0, 5))
})

// Fetch draft analysis data
fetchCSVData(csvUrls.draftAnalysis).then((data) => {
  console.log("Draft Analysis Sample:", data.slice(0, 5))
})
