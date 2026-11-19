FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/40-api-proxy.sh /docker-entrypoint.d/40-api-proxy.sh
RUN mkdir -p /etc/nginx/snippets
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
