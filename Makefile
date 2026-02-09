# Ralph — Makefile shortcuts for common automation tasks
# Run `make help` to see available targets.

.PHONY: help status validate lint typecheck build install preflight ci clean archive setup-hooks ralph

help: ## Show this help
	@echo "Ralph Automation Targets:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""

status: ## Show PRD progress, branch info, and project health
	@./automate.sh status

validate: ## Validate prd.json format and story structure
	@./automate.sh validate

lint: ## Run shellcheck + eslint
	@./automate.sh lint

typecheck: ## Run TypeScript type checking
	@./automate.sh typecheck

build: ## Build flowchart for production
	@./automate.sh build

install: ## Install all dependencies
	@./automate.sh install

preflight: ## Run all checks before a ralph run
	@./automate.sh preflight

ci: ## Full CI pipeline (install + lint + typecheck + build)
	@./automate.sh ci

clean: ## Remove build artifacts and node_modules
	@./automate.sh clean

archive: ## Archive current prd.json + progress.txt
	@./automate.sh archive

setup-hooks: ## Install git pre-commit hook
	@./automate.sh setup-hooks

ralph: ## Run ralph.sh (default 10 iterations)
	@./ralph.sh
