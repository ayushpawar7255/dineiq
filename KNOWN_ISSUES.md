# Known Issues

## Dashboard does not reliably refresh after bill capture

Status: Open; intentionally parked for follow-up after the Reports and Settings screens.

The current implementation sends the saved bill through `onBillSaved` and stores it in `sessionStorage`, but the dashboard refresh behavior is not yet considered reliable in the user's real workflow. Reproduce by capturing and saving a bill, returning to Overview, and checking the KPI and recent-bills data. Do not close this issue based on build or lint results alone; verify with a real backend response and browser reload/navigation.
