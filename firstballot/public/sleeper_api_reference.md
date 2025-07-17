
# 💤 Sleeper API Documentation (Unofficial Guide)

The Sleeper API is a **read-only** public HTTP API. No API token is required. It provides access to data about users, leagues, drafts, rosters, transactions, and more.

---

## ⚠️ Rate Limits

- Keep usage under **1000 API calls per minute** to avoid being IP-blocked.

---

## 📁 Table of Contents

1. [User Endpoints](#user-endpoints)
2. [League Endpoints](#league-endpoints)
3. [Roster Endpoints](#roster-endpoints)
4. [Matchups (Get Scores)](#matchups-get-scores)
5. [Playoff Bracket](#playoff-bracket)
6. [Transactions](#transactions)
7. [Traded Picks](#traded-picks)
8. [Draft Data](#draft-data)
9. [NFL State](#nfl-state)
10. [Players](#players)
11. [Trending Players](#trending-players)
12. [Errors](#errors)

---

## 👤 User Endpoints

### Get User by Username or ID

```
GET https://api.sleeper.app/v1/user/<username>
GET https://api.sleeper.app/v1/user/<user_id>
```

**Response Example**:

```json
{
  "username": "sleeperuser",
  "user_id": "12345678",
  "display_name": "SleeperUser",
  "avatar": "cc12ec49965eb7856f84d71cf85306af"
}
```

### Avatar URLs

- **Full Size**: `https://sleepercdn.com/avatars/<avatar_id>`
- **Thumbnail**: `https://sleepercdn.com/avatars/thumbs/<avatar_id>`

---

## 🏟️ League Endpoints

### Get All Leagues for User

```
GET https://api.sleeper.app/v1/user/<user_id>/leagues/nfl/<season>
```

### Get Specific League by ID

```
GET https://api.sleeper.app/v1/league/<league_id>
```

---

## 👥 Roster Endpoints

### Get Rosters in a League

```
GET https://api.sleeper.app/v1/league/<league_id>/rosters
```

### Get Users in a League

```
GET https://api.sleeper.app/v1/league/<league_id>/users
```

---

## 📊 Matchups (Get Scores)

### 🔥 Get Matchups for a Week

```
GET https://api.sleeper.app/v1/league/<league_id>/matchups/<week>
```

**Response Example**:

```json
[
  {
    "starters": [...],
    "players": [...],
    "roster_id": 1,
    "matchup_id": 2,
    "points": 122.56,
    "custom_points": null
  }
]
```

---

## 🏆 Playoff Bracket

### Winners Bracket

```
GET https://api.sleeper.app/v1/league/<league_id>/winners_bracket
```

### Losers Bracket

```
GET https://api.sleeper.app/v1/league/<league_id>/losers_bracket
```

---

## 🔁 Transactions

### Get Transactions by Week

```
GET https://api.sleeper.app/v1/league/<league_id>/transactions/<week>
```

---

## 🔄 Traded Picks

### Get All Traded Picks in a League

```
GET https://api.sleeper.app/v1/league/<league_id>/traded_picks
```

---

## 🧠 Draft Data

### Get All Drafts for User

```
GET https://api.sleeper.app/v1/user/<user_id>/drafts/nfl/<season>
```

### Get All Drafts for League

```
GET https://api.sleeper.app/v1/league/<league_id>/drafts
```

### Get Specific Draft

```
GET https://api.sleeper.app/v1/draft/<draft_id>
```

### Get All Picks in Draft

```
GET https://api.sleeper.app/v1/draft/<draft_id>/picks
```

### Get Traded Picks in Draft

```
GET https://api.sleeper.app/v1/draft/<draft_id>/traded_picks
```

---

## 🗓️ NFL State

### Get NFL State

```
GET https://api.sleeper.app/v1/state/nfl
```

---

## 🧍 Players

### Get All Players (Once Per Day)

```
GET https://api.sleeper.app/v1/players/nfl
```

---

## 📈 Trending Players

### Trending Adds

```
GET https://api.sleeper.app/v1/players/nfl/trending/add
```

### Trending Drops

```
GET https://api.sleeper.app/v1/players/nfl/trending/drop
```

---

## 🚨 Errors

| Code | Meaning                        |
|------|--------------------------------|
| 400  | Bad Request                    |
| 404  | Not Found                      |
| 429  | Too Many Requests              |
| 500  | Internal Server Error          |
| 503  | Service Unavailable (Maintenance) |
