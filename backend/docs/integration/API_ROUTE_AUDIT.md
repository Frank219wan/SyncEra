# Actual API route audit

Generated from the live `/openapi.json`. Declared status codes are OpenAPI declarations; runtime business errors may also occur.

| Method | Path | Request schema | Primary response | Declared codes | Status |
|---|---|---|---|---|---|
| GET | `/api/v1/health` | `none` | `#/components/schemas/Envelope_HealthData_` | 200 | REAL |
| GET | `/api/v1/explore/bubbles` | `none` | `#/components/schemas/Envelope_BubblesData_` | 200, 400, 409, 422 | MOCK |
| GET | `/api/v1/trends/roles` | `none` | `#/components/schemas/Envelope_RolesData_` | 200, 400, 409, 422 | MOCK |
| GET | `/api/v1/trends/skills` | `none` | `#/components/schemas/Envelope_SkillsData_` | 200, 400, 409, 422 | MOCK |
| GET | `/api/v1/roles/{role_id}` | `none` | `#/components/schemas/Envelope_RoleData_` | 200, 404, 422 | MOCK |
| GET | `/api/v1/roles/{role_id}/tasks` | `none` | `#/components/schemas/Envelope_TasksData_` | 200, 404, 409, 422 | MOCK |
| GET | `/api/v1/evidence/{evidence_id}` | `none` | `#/components/schemas/Envelope_EvidenceData_` | 200, 404, 422 | MOCK |
| POST | `/api/v1/profiles/normalize` | `application/json: #/components/schemas/NormalizeRequest` | `#/components/schemas/Envelope_NormalizeData_` | 200, 400, 422, 502, 504 | PARTIAL |
| POST | `/api/v1/profiles/upload` | `multipart/form-data: #/components/schemas/Body_upload_profile_api_v1_profiles_upload_post` | `#/components/schemas/Envelope_NormalizeData_` | 200, 413, 415, 422, 502, 504 | PARTIAL |
| POST | `/api/v1/profiles/confirm` | `application/json: #/components/schemas/ConfirmRequest` | `#/components/schemas/Envelope_ConfirmData_` | 200, 404, 409, 422 | REAL |
| POST | `/api/v1/recommendations` | `application/json: #/components/schemas/RecommendRequest` | `#/components/schemas/Envelope_RecommendData_` | 200, 400, 404, 409, 422, 502, 504 | MOCK |
| POST | `/api/v1/learning/skill-map` | `application/json: #/components/schemas/SkillMapRequest` | `#/components/schemas/Envelope_SkillMapData_` | 200, 404, 422 | MOCK |
| POST | `/api/v1/learning/roadmap` | `application/json: #/components/schemas/RoadmapRequest` | `#/components/schemas/Envelope_RoadmapData_` | 200, 404, 422 | MOCK |
| POST | `/api/v1/progress/skills` | `application/json: inline` | `#/components/schemas/APIErrorEnvelope` | 503, 422 | P1_DISABLED |
| POST | `/api/v1/organizations/{mode}/analyze` | `application/json: inline` | `#/components/schemas/APIErrorEnvelope` | 503, 400, 422 | P1_DISABLED |
| POST | `/api/v1/admin/trends/refresh` | `application/json: inline` | `#/components/schemas/APIErrorEnvelope` | 503, 422 | P1_DISABLED |

Upload is a proposed additive v1 extension. P1 routes return 503. `MOCK` means synthetic market/role or rule-only output. `PARTIAL` means real input or parsing with rule-only extraction.
