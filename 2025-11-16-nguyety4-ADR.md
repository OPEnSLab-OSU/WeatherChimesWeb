# ADR-001: Backend-Driven Time Range Selection for Data Retrieval

**Status:** Accepted  
**Date:** 2025-11-16  
**Author:** Tyler Nguyen (nguyety4)  

---

## Context

The Ear2Earth / WeatherChimes web client retrieves environmental sensor data from MongoDB and lets users:

- Plot it using Plotly
- Sonify it using Tone.js 

Originally, the system only supported **last X packets** retrieval. This is limiting because:

- Instructors and researchers often need **specific time windows**, not just recent data.
- Users have no visibility into **the valid date range available** for a given (database, device) pair.
- Manually guessing times often results in empty responses.
- The frontend needs a **calendar-based workflow** instead of a text-based input.

We needed a more reliable, user-friendly system for retrieving data based on precise time intervals.

---

## Decision

We introduced a **backend-driven time range feature** with three key changes:

1. A new `/date-range` endpoint that returns the **minimum and maximum timestamps** for a selected device.
2. An update to the `/data` endpoint so it accepts either:
- `x` (for last X packets), or
- `startTime` + `endTime` (for a calendar-based range).
3. Frontend logic that
- Requests `/date-range` whenever the user selects a device,
- Sets calendar input bounds (`min`, `max`),
- Automatically fills defaults,
- Validates ranges,
- Sends correctly encoded ISO timestamps to the server.

This preserves the old workflow while adding a new, more powerful mode.

---

## Options Considered

### Option 1 - Keep "last X packets" only
- Simple but insufficient.
- No way to target meaningful events in time.
- Often returns irrelevant or empty data.

### Option 2 — Client-only time filtering
- Would require downloading huge amounts of data first.
- Inefficient and inaccurate for long-running devices.

### Option 3 — Add backend-supported time range retrieval (Chosen)
- MongoDB efficiently computes min/max timestamps.
- Server filters the actual requested interval.
- Frontend calendar inputs become constrained and user-friendly.
- Works seamlessly with existing features.

---

## Rationale
We chose backend-supported time range retrieval because it:
- **Improves UX**: Users get accurate calendar bounds and fewer empty queries.
- **Is efficient**: MongoDB handles date filtering directly.
- **Is maintainable**: Clear API contract between frontend and backend.
- **Is flexible**: Supports both legacy packet-count retrieval and new time-range workflows.
- **Aligns with project goals**: Enables more meaningful sonification and visualization workflows.
This option provides the best balance of usability, performance, and long-term maintainability.

---

## Consequences
### Positive
- Users can reliably select valid time ranges.
- Supports more scientific or instructional use cases.
- Reduces confusion and failed queries.
- Keeps backward compatibility with the previous system.

### Negative
- Slightly increased backend complexity: two paths in `/data` and one new endpoint.
- Requires frontend logic to manage date bounds and validation.
- Must ensure timestamp fields (`time_local` and `time_utc`) remain consistent.

### Follow-Up Considerations
- Add automated tests for date-range retrieval.
- Consider adding presets (e.g., “last 24 hours,” “full dataset”).
- Add database indexes for timestamp queries if needed.

---

## References 
- Team discussion on improving usability of data retrieval (10/17/2025 meeting notes heading)
  - https://docs.google.com/document/d/16FPlVFDk9f0ix2eeuLFWQ52FYJr4ehXM6BzzxcGQRy0/edit?tab=t.opw32jz8xa2b#heading=h.xb28f268ca4v
- **Screenshot**: API response from `/date-range` showing correct min/max timestamps.
![API response screenshot](images/api-date-response.png)
- **Snippet**: MongoDB aggregation pipeline used to compute date range:
```js
  { $group: { _id: null, minDate: { $min: "$t" }, maxDate: { $max: "$t" } } }