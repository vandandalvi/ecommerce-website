# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
