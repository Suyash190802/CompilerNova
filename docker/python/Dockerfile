FROM python:3.13-alpine

WORKDIR /app

RUN addgroup -S runner && adduser -S runner -G runner

USER runner

CMD ["python", "/app/main.py"]