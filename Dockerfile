# Kaptajn Kaper i Kattegat - Docker Build Environment
# Builds and runs the Phaser 3 + TypeScript game

FROM node:20-alpine

# Set working directory
WORKDIR /app

# No additional dependencies needed - Node includes everything

# Copy package files
COPY package.json package-lock.json* ./

# Install npm dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy entire project
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Expose build output for production
EXPOSE 3000

# Health check using wget (available in Alpine)
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O- http://localhost:5173 || exit 1

# Default command: run dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
