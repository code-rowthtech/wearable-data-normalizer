# wearable-data-normalizer

Normalize invented Fitbit, Apple Health and Oura step records without losing time precision or source provenance.

[![tests](https://github.com/code-rowthtech/wearable-data-normalizer/actions/workflows/ci.yml/badge.svg)](https://github.com/code-rowthtech/wearable-data-normalizer/actions/workflows/ci.yml)

Educational sample using synthetic data. The badge above reports the actual GitHub Actions status; passing local tests does not imply exchange acceptance or production readiness.

## The problem it solves

Vendor exports describe different intervals and totals; conflating them can double-count activity or invent timestamps.

All bundled sample data is invented and synthetic. No real people, production exports, client code or credentials are included. This is a working scoped sample, not a production implementation.

## How it works

```mermaid
flowchart LR
    A["Fitbit JSON + Apple Health XML + Oura JSON"] --> B["Validation + normalization"] --> C["Source-preserving records"]
```

Steps only. Fitbit daily `activities-steps` JSON and Oura `daily_activity`-shaped JSON retain day precision and unknown time-of-day. Apple Health StepCount XML records preserve an interval with explicit offsets converted to UTC. No fake midnight timestamp is assigned to daily totals.

Common fields: stable ID, source/sourceRecord, metric, value, unit and period `{date,start,end,precision}`. Identical records deduplicate; conflicting values for the same source identity fail. Records from different vendors remain distinct and are not summed. Apple intervals from overlapping devices are not reconciled.

Only local files are read; no OAuth tokens or vendor API calls are used. XML declarations of entities/DOCTYPE are rejected, entities are not expanded, and input is limited to 1MB for this small demo.

## Run it in 3 commands

Node.js 22.18+ and npm. TypeScript is executed using native type stripping; `npm run typecheck` runs the separate compiler check. Run these from this repository's directory after cloning/extracting it:

```bash
npm ci --ignore-scripts
npm test
npm start
```

Dependencies may need an initial internet download. Default examples use only bundled synthetic data and local processing. Nothing is sent to a healthcare exchange. Environment templates list names only and contain no values; offline samples need no environment variables.

## Sample input and output

`sample-data/fitbit.json`, `apple-health.xml`, and `oura.json`: small invented vendor-shaped fixtures.

Expected summary (or abbreviated structured output):

```text
{"records":3,"sources":["apple-health","fitbit","oura"],"output":"output/normalized.json","combinedStepTotal":null}
```

Full output examples are under `sample-data/expected-output.json` when applicable. Generated artifacts go to ignored `output/`. Tests cover valid data and meaningful negative cases; the CI workflow runs tests, the demo command, TypeScript checks where relevant, and Gitleaks.

## What we would add in production

Add broader metrics with unit conversions, versioned vendor schemas, streaming large XML imports, OAuth/export consent, timezone/DST reconciliation, source-priority and overlap rules, privacy controls and retention policies.

## Built by RowthTech

Healthcare software engineering samples, independently written for this portfolio. MIT licensed. Priority: P1; market: US.

Primary references consulted on 13 November 2026:

- [https://dev.fitbit.com/build/reference/web-api/intraday/get-activity-intraday-by-date-range/](https://dev.fitbit.com/build/reference/web-api/intraday/get-activity-intraday-by-date-range/)
- [https://developer.apple.com/documentation/healthkit/hkquantitytypeidentifier/stepcount](https://developer.apple.com/documentation/healthkit/hkquantitytypeidentifier/stepcount)
- [https://cloud.ouraring.com/v2/docs](https://cloud.ouraring.com/v2/docs)
- [https://github.com/NaturalIntelligence/fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)

Before public release: clean-clone run, clean Gitleaks scan, second-engineer review, and approval from Mukesh or Raavish. For GCC samples, current exchange implementation-guide/profile review is an additional publication gate. No approvals or exchange acceptance are implied by local tests.
