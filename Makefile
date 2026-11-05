-include .env
export

COMPOSE = docker compose
COMPOSE_DEV = docker compose -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: all env build up down restart logs ps migrate makemigrations superuser shell clean fclean re dev dev-down

all: env build up

env:
	@test -f .env || ( \
		sed "s/^DJANGO_SECRET_KEY=.*/DJANGO_SECRET_KEY=$$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c 50)/" .env.example > .env && \
		echo "Created .env from .env.example (with a random secret key)")

build: env
	$(COMPOSE) build

up: env
	$(COMPOSE) up -d
	@echo "Budget is running on http://localhost:$${HTTP_PORT:-8080}"

down:
	$(COMPOSE) down

# Dev mode: hot reload, Django DEBUG, logs in the foreground (Ctrl+C to stop).
dev: env
	@echo "Dev mode on http://localhost:$${HTTP_PORT:-8080}"
	$(COMPOSE_DEV) up --build --remove-orphans

dev-down:
	$(COMPOSE_DEV) down

makemigrations:
	$(COMPOSE) exec backend python manage.py makemigrations

restart: down up

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

migrate:
	$(COMPOSE) exec backend python manage.py migrate

superuser:
	$(COMPOSE) exec backend python manage.py createsuperuser

shell:
	$(COMPOSE) exec backend python manage.py shell

clean:
	$(COMPOSE) down --remove-orphans

fclean:
	$(COMPOSE) down -v --rmi local --remove-orphans

re: fclean all
