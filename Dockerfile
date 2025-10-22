# Dockerfile at project root
FROM node:20-alpine
WORKDIR /app

#  Copy package files from the app folder
COPY app/package*.json ./

#  Install only production dependencies
RUN npm ci --omit=dev || npm i --omit=dev

#  Copy the entire app source code into the image
COPY app/ .

#  Expose the app’s port
EXPOSE 8080

#  Default start command
CMD ["npm", "start"]
