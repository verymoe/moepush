FROM node:22.21.1-bookworm-slim

WORKDIR /app
RUN npm install --global pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm build
RUN mkdir /data && chown node:node /data

ENV MOEPUSH_LOCAL_STORE=/data
ENV AUTH_TRUST_HOST=true
EXPOSE 3000
VOLUME ["/data"]
USER node

CMD ["pnpm", "start"]
