"""Entry point for the daily cron job."""
import logging
import sys

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    stream=sys.stdout,
)

from backend.services.scraper import run_scraper  # noqa: E402

if __name__ == "__main__":
    result = run_scraper()
    print(f"Done: {result}")
