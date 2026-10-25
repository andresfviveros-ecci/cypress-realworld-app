# Execution results — `yarn test:pw` (2026-10-25)

Playwright 1.64.1 · Node v24.14.0 · Chromium headless shell 156.0.8078.4 · 27 tests: 19 passed, 8 failed.
Every failure is a confirmed defect of the application; the assertions describe the correct behaviour and were not relaxed.

| # | Test | Point | Result | Reason if failed |
|---|------|-------|--------|------------------|
| 1 | setup: log in as Heath93 and store the session | setup | passed | |
| 2 | E1 getByRole: New transaction button | 1 | passed | |
| 3 | E2 getByPlaceholder: contact search field | 1 | passed | |
| 4 | E3 getByText: recipient Kristian Bradtke | 1 | passed | |
| 5 | E4 getByTestId: account balance | 1 | passed | |
| 6 | CSS locator vs user-facing locator (Mine tab) | 1 | passed | |
| 7 | Strictness: ambiguous locator fails, precise one fixes it | 1 | passed | |
| 8 | Payment flow with click, fill, press, hover | 2 | passed | |
| 9 | check(): Remember me checkbox | 2 | passed | |
| 10 | Payment flow with state, text/value, page, API and generic assertions | 3 | passed | |
| 11 | TC-TRANS-017: amount 0 rejected by the API | 4 | failed | BUG-001: API answers 200 |
| 12 | TC-TRANS-018: empty note rejected by the API | 4 | failed | BUG-005: API answers 200 and moves $10.00 |
| 13 | R1 TC-TRANS-010: no recipient | 4 | passed | |
| 14 | R2 TC-TRANS-011: valid amount and note | 4 | passed | |
| 15 | R3 TC-TRANS-012: valid amount, empty note | 4 | passed | |
| 16 | R4 TC-TRANS-013: empty amount, note | 4 | passed | |
| 17 | R5 TC-TRANS-014: amount 0, note | 4 | failed | BUG-001: no error, Pay enabled, transaction stored |
| 18 | R6 TC-TRANS-015: empty amount, empty note | 4 | passed | |
| 19 | R7 TC-TRANS-016: amount 0, empty note | 4 | failed | BUG-001: amount 0 not flagged as invalid |
| 20 | TC-STATE-01: create request -> receiver accepts | 5 | passed | |
| 21 | TC-STATE-02: receiver rejects, no money moves | 5 | failed | BUG-002: rejecting moves $25.00 |
| 22 | TC-STATE-03: accept with insufficient balance | 5 | passed | |
| 23 | TC-STATE-04: accepted request shows no Accept/Reject (UI) | 5 | passed | |
| 24 | TC-STATE-05: accept an accepted request again (API) | 5 | failed | BUG-003: 204 and a second charge of $25.00 |
| 25 | TC-STATE-06: accept a rejected request (API) | 5 | failed | BUG-003: 204, state becomes accepted, charged again |
| 26 | Guard: requester accepts own request (API) | 5 | failed | BUG-004: 204, Kristian charged without acting |
| 27 | Smoke: logged-in user sees the New button | setup | passed | |

Request/response and balances for each defect: `bug-00X-*.json` in this folder. Full terminal output: `run-log.txt`.
