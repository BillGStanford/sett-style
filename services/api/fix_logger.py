import os

path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "core", "logging", "logger.py"
)

content = '''\
import structlog
import logging


def setup_logging() -> None:
    """Configure structlog. Call once at application startup."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(colors=False),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str):
    """Get a structlog logger."""
    return structlog.get_logger(name)
'''

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Fixed: {path}")
print("\nNow run:  python -m uvicorn main:app --reload --port 8000")