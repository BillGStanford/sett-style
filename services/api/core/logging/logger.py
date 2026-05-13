"""
SETT API — Structured Logging
Uses structlog for JSON-formatted structured logs.
"""

import structlog
import logging
import sys


def setup_logging() -> None:
    """Configure structlog. Call once at application startup."""

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        # Removed add_logger_name — it requires stdlib logger, not PrintLogger
    ]

    processors = shared_processors + [
        structlog.dev.ConsoleRenderer(colors=False)
    ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Silence noisy libraries
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str):
    """Get a logger bound to the given module name."""
    return structlog.get_logger(name)
