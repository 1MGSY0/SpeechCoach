FROM node:20-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--webpack", "--hostname", "0.0.0.0", "--port", "3000"]
