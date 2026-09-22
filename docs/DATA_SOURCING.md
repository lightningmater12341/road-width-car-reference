# Indian Vehicle Dimensions: Sourcing and QA Plan

## Target definition

The production database covers passenger vehicles currently sold new in India. Each row represents a specific model generation and effective date range, not merely a reused model name.

The canonical measurement is `width_body_mm`: the maximum production body width excluding exterior mirrors, open doors, temporary accessories, and dealer-fitted attachments.

## Source priority

1. Current official manufacturer brochure or specification sheet.
2. Current official manufacturer model webpage.
3. Indian homologation/type-approval document when publicly available.
4. Two reputable automotive specification databases as cross-checks.
5. Controlled manual measurement only when published sources remain ambiguous.

SIAM model-wise reports can help establish the universe of models sold, but they are a catalogue/sales source rather than the preferred authority for physical dimensions.

## Collection workflow

1. Build the active model list by manufacturer.
2. Resolve generation, facelift, and sale dates.
3. Save the source URL, title, publisher, document date, and access timestamp.
4. Transcribe length, body width, height, and wheelbase exactly as published.
5. Record the source's wording about mirrors. Never silently assume exclusion.
6. Compare against a second source.
7. Flag differences greater than 5 mm for manual review.
8. Mark the record `manufacturer_confirmed` only when the official source clearly defines the dimension.
9. Recheck active models every quarter and immediately after a facelift or new generation.

## Quality rules

- Store millimetres without rounding to centimetres.
- Do not mix global and India-specific generations.
- Do not overwrite earlier dimensions; close their effective date range.
- Allow variant-level records when body kits or wheel-arch cladding change width.
- Keep mirror-open and mirror-folded widths separate when provided.
- Keep OCR/transcription evidence for audit, but do not redistribute copyrighted brochures inside the product.
- Display only records whose sale status and dimensions were checked recently.

## Starter data warning

`cars-india-starter.json` is an interface-development seed. Every record is intentionally marked `starter_needs_recheck`. It must not be treated as a completed or legally authoritative all-India vehicle database.

## Useful starting points

- SIAM statistical publications: https://www.siam.in/statistical-services/statistical-profile
- ARAI: https://www.araiindia.com/
- Manufacturer websites and current downloadable brochures

