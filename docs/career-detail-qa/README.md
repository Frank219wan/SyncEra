# Real API career detail visual QA

Screenshots use a local, deterministic synthetic HTTP adapter with a synthetic Data Analyst role. They show the pre-change Real API layout and the new layout using identical role data. They are not captures of Production or a protected Vercel Preview.

- `real-before.jpg`: previous connected detail at desktop width.
- `real-after.jpg`: new connected detail at desktop width, light mode.
- `real-after-dark.jpg`: new connected detail at desktop width, dark mode.

The local browser confirmed Moderate/Fast score changes from 69.5 to 67.5 through `/api/v1/recommendations`; the Task X-Ray and Evidence tabs rendered synthetic API evidence. English, Chinese and Malay controls were inspected. The in-app browser did not apply its requested 390px viewport override (`innerWidth` remained 1280), so exact 390px and 320px visual overflow checks remain open. The CSS includes wrapping at these breakpoints, but this is not a substitute for a mobile viewport test.
