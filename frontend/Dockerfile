FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# react-scripts 5 has legacy peer-dependency declarations that conflict with
# this project's React 19 dependency tree. Keep the lockfile, but accept them.
RUN npm ci --legacy-peer-deps
COPY public public
COPY src src
COPY tsconfig.json ./
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
