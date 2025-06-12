# Use official Node.js LTS image
FROM node:18-alpine

# Create app directory and set permissions
WORKDIR /app

# Create a non-root user with UID 1000
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -S appuser

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app source
COPY . .

# Set correct permissions
RUN chown -R 1000:1000 /app

# Switch to non-root user
USER 1000:1000

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"] 