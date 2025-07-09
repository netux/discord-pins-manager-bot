FROM node:20-slim

WORKDIR /app
ADD . /app

# Install utilities
RUN apt-get update && apt-get install -y nano

# Install dependencies and build
RUN npm install
RUN npm run build

# Ensure latest commands are deployed
RUN node --require dotenv/config dist/src/bin/deploy-commands.js

CMD ["node", "--require", "dotenv/config", "dist/src/index.js"]
