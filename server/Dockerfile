FROM node:24-alpine
WORKDIR /app
COPY server/ ./server/
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s CMD wget -q -O- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "server/server.mjs"]