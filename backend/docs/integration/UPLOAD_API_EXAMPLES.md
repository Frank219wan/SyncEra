# Synthetic CV upload HTTP examples

The live multipart request/response records are in `upload_pdf.json` and `upload_docx.json`. Binary CVs were generated in memory and were not saved. The `file` object in each record describes the transmitted binary; `study_constraints` is a JSON form field. Both responses are unconfirmed profiles with `meta.is_mock=true` because the rule-only adapter is active. See `confirm.json` and `recommend_unconfirmed.json` for the confirmation boundary.
