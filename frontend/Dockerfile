# Build stage
FROM node:20-alpine AS build

WORKDIR /app

ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package.json ./
RUN npm install

COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built React app
COPY --from=build /app/build /usr/share/nginx/html

# Custom Nginx config with API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
