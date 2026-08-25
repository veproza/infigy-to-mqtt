FROM node:20-alpine

# Run as the non-root user that the node image already provides
WORKDIR /app

# Install dependencies first so this layer is cached unless the lockfile changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the application source
COPY infigy-to-mqtt.js sensors.js controls.js credentials.js ./

USER node

CMD ["node", "infigy-to-mqtt.js"]
