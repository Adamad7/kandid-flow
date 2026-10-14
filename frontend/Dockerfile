FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package.json ./
RUN npm install

# Copy application files
COPY . .

EXPOSE 5173

# Run Vite dev server with host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
