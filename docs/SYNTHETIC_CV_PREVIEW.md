# Synthetic CV upload — Preview acceptance

This feature is for **entirely fictional test CVs only**. A checkbox and the
`synthetic_input=true` form field record a declaration; neither can detect
hidden real personal data. Keep both Vercel Previews authenticated. Do not
enable the backend upload gate or accept real CVs until the deployment owner
has approved the privacy and retention plan.

## Code path and limits

- TXT remains a local UTF-8 import (at most 50,000 characters). It does not
  use the multipart route until the user continues through normal profile
  normalization.
- PDF/DOCX in real API mode use `POST /api/v1/profiles/upload` through the
  same-origin frontend proxy. Demo mode does not upload these files.
- The proxy allows multipart on this **exact route only**. It requires the
  fictional-data declaration, one PDF/DOCX file, and bounded study constraints.
  Its complete request body is limited to 3 MiB; the file itself is limited
  to 3 MiB minus 16 KiB of form overhead. File extension, media type and
  signature are checked before forwarding; the backend validates PDF/OOXML
  structure and extraction limits. Scanned PDFs have no OCR and return
  `CV_NO_TEXT`.
- Upload body read has a 10-second deadline; the proxy request has a 52-second
  total deadline, the browser waits up to 58 seconds, and the frontend Vercel
  function is configured for at most 60 seconds. The MiniMax adapter has a
  30-second timeout. A timeout is returned as a bounded error, not silently
  retried. Confirm the backend Preview function can run long enough for
  parsing and model extraction before enabling the gate.
- A successful response is an **unconfirmed** profile. The user must review
  extracted fields and skills, then confirm before requesting recommendations.
  Neither files nor extracted CV text are intentionally logged or persisted by
  the upload path. Runtime multipart handling may temporarily spool bytes.

## Preview-only deployment gate

1. Deploy this PR to the protected frontend and backend Preview projects.
   Keep Production unchanged. Configure `VITE_API_MODE=real` on the frontend
   Preview build and retain Vercel Authentication. The existing PR #13 release
   report says the WAF rule is not yet published/verified for all Preview
   hostnames; do not treat the in-memory proxy rate limit as a substitute.
2. Keep the server-only frontend variables `BACKEND_PREVIEW_ORIGIN` (the exact
   allowed backend Preview HTTPS origin) and
   `BACKEND_PROTECTION_BYPASS_SECRET` in Preview scope only. Never expose them
   through `VITE_` variables, browser responses or logs.
3. Have the deployment owner verify the backend Preview's actual
   `PROFILE_STORE=postgres`, pooled/TLS Neon URL, `FRONTEND_ORIGINS`, and
   configured AI adapter. MiniMax requires the approved adapter module and
   TokenHub model key on Backend Preview; the current deployed values are not
   established by this code change. This task does not create or modify
   those settings, credentials, or database data.
4. `ENABLE_SYNTHETIC_UPLOAD` must remain **unset/disabled** until the deployment
   owner explicitly verifies both authentication gates, WAF, function duration,
   preview origin, file policy and fictional-data notice. Only then may the
   owner set `ENABLE_SYNTHETIC_UPLOAD=1` on the **backend Preview** project.
   Never set it on Production.

## Acceptance checklist

1. In the protected frontend Preview, open Individual → My profile → Create
   profile → Your experience. Confirm the fictional-only checkbox. Import a
   fictional TXT file and verify it fills the editable text field locally.
2. With the backend gate still disabled, upload a fictional text-based PDF:
   the UI should show the `UPLOAD_DISABLED` message, not claim success.
3. After the deployment owner enables the Preview gate, upload fictional
   text-based PDF and DOCX samples below the limit. Both must open an
   unconfirmed review profile. Confirm the suggested skills, then verify that
   recommendations become available. Before confirmation, recommendations
   must return `PROFILE_NOT_CONFIRMED`.
4. Try a scanned/image-only PDF, a renamed non-PDF/DOCX, an oversized file,
   a duplicate/extra multipart field, and a real-data declaration left
   unchecked. Verify explicit rejection and no backend forwarding for proxy
   rejects. Test unauthenticated access in a private browser window; Vercel
   Authentication must block it before the proxy.
5. Check Preview function logs for request IDs/status only—no file content,
   extracted text, database password, bypass secret or model key. Verify the
   upload path is unavailable on Production.

Local CI exercises PDF/DOCX through the proxy and a real local backend using
fictional generated files. The MiniMax adapter test uses `MockTransport`, not
a paid model call. A live protected-Preview acceptance test is still required
after deployment configuration is approved.
