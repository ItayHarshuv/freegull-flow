FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY . .

RUN corepack pnpm install --frozen-lockfile

EXPOSE 3000

CMD ["sh", "-c", "corepack pnpm dev -- --host 0.0.0.0 --port 3000"]
