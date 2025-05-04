FROM node:16-alpine

WORKDIR /app

# Install additional dependencies for better development experience
RUN apk add --no-cache libc6-compat

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Expose port for React development server
EXPOSE 3000

# Start the React development server
CMD ["npm", "start"]
