# Use the official Node.js image with version 20.16.0 as the base
FROM node:20.16.0

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 4000

# Command to run your application in development mode
CMD ["npm", "run", "dev"]
