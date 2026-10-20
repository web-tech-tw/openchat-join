FROM oven/bun:alpine

ENV TRUST_PROXY="uniquelocal"
ENV HTTP_HOSTNAME="0.0.0.0"
ENV RUNTIME_ENV="container"

RUN addgroup -g 3000 join && \
    adduser -HD -u 3000 -G join -h /app join

WORKDIR /app
RUN chown 3000:3000 /app

USER 3000

COPY --chown=3000:3000 package.json bun.lock ./
RUN bun install --production

COPY --chown=3000:3000 . .

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/robots.txt || exit 1
CMD ["bun", "start"]
