FROM node:22-alpine

WORKDIR /app

RUN addgroup -S runner && adduser -S runner -G runner

USER runner

CMD ["node", "/app/main.js"]