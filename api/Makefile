.PHONY: install dev test lint format clean run

# Install dependencies
install:
	poetry install

# Install development dependencies
dev:
	poetry install --with dev

# Run the FastAPI server in development mode
run:
	poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run the FastAPI server in production mode
serve:
	poetry run uvicorn main:app --host 0.0.0.0 --port 8000

# Run tests
test:
	poetry run pytest -v

# Run linting checks
lint:
	poetry run ruff check .
	poetry run mypy .

# Format code
format:
	poetry run ruff format .
	poetry run ruff check --fix .

# Dev database
setup-pg-dev:
	docker run --name postgres-llm \
		-e POSTGRES_USER=user \
		-e POSTGRES_PASSWORD=password \
		-e POSTGRES_DB=llm_tournament \
		-p 5433:5432 \
		-d postgres:15
	sleep 5
	poetry run python scripts/setup_db.py

# Stop and remove dev database
teardown-pg-dev:
	docker stop postgres-llm || true
	docker rm postgres-llm || true

# Clean cache and temporary files
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +

# Show help
help:
	@echo "Available commands:"
	@echo "  install         - Install dependencies"
	@echo "  dev             - Install development dependencies"
	@echo "  run             - Run FastAPI server in development mode"
	@echo "  serve           - Run FastAPI server in production mode"
	@echo "  test            - Run tests"
	@echo "  lint            - Run linting checks"
	@echo "  format          - Format code"
	@echo "  setup-pg-dev    - Setup PostgreSQL development database"
	@echo "  teardown-pg-dev - Stop and remove PostgreSQL development database"
	@echo "  clean           - Clean cache and temporary files"