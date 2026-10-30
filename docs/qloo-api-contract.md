# Qloo API Contract Specification

> **Documentation References:**
> - [Qloo Agentic / LLM Hackathon Developer Guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide)
> - [Qloo Insights API Deep Dive](https://docs.qloo.com/reference/insights-api-deep-dive)
> - [Qloo Search Entities Reference](https://docs.qloo.com/reference/get-search)
> - [Qloo API Overview (Public Reference)](https://raw.githubusercontent.com/qloo/docs-public/main/reference/api-overview.md)

---

## 1. Verified Core Connection Details

| Specification | Value | Verification Status | Source Reference |
|---|---|---|---|
| **Hackathon Base URL** | `https://hackathon.api.qloo.com/v2` (or `https://hackathon.api.qloo.com`) | **VERIFIED FROM DOCS** | Qloo Developer Guide / Hackathon references |
| **Standard Production Base URL** | `https://api.qloo.com/v2` | **VERIFIED FROM DOCS** | [docs.qloo.com/reference](https://docs.qloo.com/reference) |
| **Authentication Header** | `X-Api-Key: <QLOO_API_KEY>` | **VERIFIED FROM DOCS** | Qloo Developer Guide & cURL examples |
| **Content-Type** | `application/json` | **VERIFIED FROM DOCS** | API Overview |
| **Client Exposure** | Server-side ONLY (`process.env.QLOO_API_KEY`) | **VERIFIED REQUIREMENT** | TASTESPEC Architecture Contract |

---

## 2. Verified Endpoints & Parameters

### 2.1 Entity Search Endpoint (`/search` or `/v2/search`)
- **Purpose:** Resolve natural language names (e.g. film, artist, restaurant) to Qloo IDs (`entity_id` / `id`) and category mappings.
- **HTTP Method:** `GET`
- **Query Parameters:**
  - `query` *(required)*: Name or search phrase (e.g., `query=Radiohead`, `query=The+Zone+of+Interest`).
  - `type` *(optional)*: Entity category / domain filter (e.g., `music`, `film`, `brand`, `place`).
- **Response Structure (Documented Target):**
  - Array of matching entity objects containing:
    - `id` / `entity_id`: Qloo unique identifier.
    - `name`: Normalized name.
    - `type` / `subtype`: Domain taxonomy.
    - `popularity` / `attributes`: Metadata tags.

### 2.2 Insights API Endpoint (`/v2/insights` or `/insights`)
- **Purpose:** Cross-domain taste analysis, affinity computation, and cultural correlation querying.
- **HTTP Method:** `GET`
- **Query Parameters:**
  - `signal.interests.entities` *(required/standard)*: One or more Qloo entity IDs anchoring the taste profile (comma-separated or repeated).
  - `signal.interests.tags` *(optional)*: Cultural or thematic tag identifiers.
  - `filter.type` *(required)*: Domain scope of insight, formatted as URN:
    - `urn:tag`: Characteristic cultural tags.
    - `urn:demographics`: Demographic breakdown.
    - `urn:entity:brand`, `urn:entity:artist`, `urn:entity:place`, `urn:entity:film`: Target recommendation domain.
- **Response Structure (Documented Target):**
  - List of correlated entities/tags with affinity or correlation score metrics.

---

## 3. Rate Limits, Error Handling & Unknowns

### 3.1 Documented Error Codes & Behavior
- **`401 Unauthorized` / `403 Forbidden`**: Missing or invalid `X-Api-Key` header.
- **`400 Bad Request`**: Malformed parameter syntax (e.g. invalid `filter.type` format or unsupported parameter combinations).
- **`404 Not Found`**: Entity ID or endpoint does not exist.
- **`429 Too Many Requests`**: Rate limit exceeded. Handled with backoff and retry.
- **`500 Internal Server Error`**: Upstream service error.

### 3.2 Items Marked UNKNOWN (Pending Live API Execution)
- **Exact Rate Limit Tier & Concurrency Limits:** `UNKNOWN` (depends on specific hackathon API key allocation).
- **Exact JSON Envelope Structure for Live Search Responses:** `UNKNOWN` until live response is returned from `https://hackathon.api.qloo.com` (e.g. top-level array vs `{ data: [...] }` vs `{ results: [...] }`).
- **Exact Score Scale for Live Affinity:** `UNKNOWN` (whether reported as $0.0 - 1.0$, percentage $0 - 100$, or relative correlation index).

---
