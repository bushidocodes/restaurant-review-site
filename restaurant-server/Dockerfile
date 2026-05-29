FROM node:18

# Set the working directory to /app
WORKDIR /app

# Install project dependencies first to leverage Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the rest of the application source
COPY . .

EXPOSE 1337

# Start the server when the container launches
CMD ["node", "server"]
