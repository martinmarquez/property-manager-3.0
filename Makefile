# Corredor CRM — developer convenience targets
# All targets delegate to docker compose, pnpm, or scripts/dev-up.sh.
# Run `make help` to list all targets.

.PHONY: help dev-up dev-down dev-reset db-migrate db-seed db-studio \
        logs logs-pg logs-redis ps clean-volumes

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# Dev stack lifecycle
# ---------------------------------------------------------------------------

dev-up: ## Start all services + run migrations + seeds (full bootstrap)
	@./scripts/dev-up.sh

dev-up-obs: ## Start all services including Jaeger observability
	@./scripts/dev-up.sh --observability

dev-down: ## Stop all services (data volumes preserved)
	docker compose down

dev-reset: ## Stop services AND delete all data volumes (full reset)
	docker compose down -v
	@echo "All volumes deleted. Run 'make dev-up' to start fresh."

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

db-migrate: ## Run pending Drizzle migrations
	pnpm --filter @corredor/db migrate

db-seed: ## Run database seeds
	pnpm --filter @corredor/db seed

db-studio: ## Open Drizzle Studio (visual DB browser)
	pnpm --filter @corredor/db studio

db-shell: ## Open psql shell in the running Postgres container
	docker compose exec postgres psql -U corredor -d corredor

# ---------------------------------------------------------------------------
# Logs and status
# ---------------------------------------------------------------------------

ps: ## Show running container status
	docker compose ps

logs: ## Tail logs from all services
	docker compose logs -f

logs-pg: ## Tail Postgres logs only
	docker compose logs -f postgres

logs-redis: ## Tail Redis logs only
	docker compose logs -f redis

logs-minio: ## Tail MinIO logs only
	docker compose logs -f minio

logs-mail: ## Tail Mailhog logs only
	docker compose logs -f mailhog

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

clean-volumes: ## Delete named Docker volumes for this project (irreversible!)
	@echo "This will delete all local database data. Are you sure? [y/N]" && \
	  read ans && [ $${ans:-N} = y ] && docker volume rm \
	    corredor_postgres_data corredor_redis_data corredor_minio_data || \
	  echo "Aborted."
