# SETT — Background Job Definitions
#
# These jobs run on a schedule via GitHub Actions cron OR Railway.app cron.
# All job logic lives in workers/ (root level)
#
# Schedule (UTC):
#   aggregate_trends      — daily 00:00 UTC
#   confirm_commissions   — daily 02:00 UTC
#   cleanup_drafts        — weekly Sunday 03:00 UTC  
#   update_trending       — hourly (future)
#
# To run manually from project root:
#   python workers/aggregate_trends.py
#   python workers/confirm_commissions.py
#   python workers/cleanup_drafts.py

JOBS = {
    "aggregate_trends": {
        "schedule": "0 0 * * *",
        "script": "workers/aggregate_trends.py",
        "description": "Aggregate daily trend signals from set_likes, sets published, and affiliate_clicks into trend_signals table.",
        "timeout_seconds": 120,
    },
    "confirm_commissions": {
        "schedule": "0 2 * * *",
        "script": "workers/confirm_commissions.py",
        "description": "Move confirmed affiliate commissions from pending_balance to wallet_balance after the 60-day reversal window.",
        "timeout_seconds": 300,
    },
    "cleanup_drafts": {
        "schedule": "0 3 * * 0",
        "script": "workers/cleanup_drafts.py",
        "description": "Soft-delete canvas drafts older than 90 days that were never published.",
        "timeout_seconds": 120,
    },
}