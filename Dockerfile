# Build stage
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine AS production-stage
# Create subfolder to match the base URL /food_tracker/
RUN mkdir -p /usr/share/nginx/html/food_tracker
COPY --from=build-stage /app/dist /usr/share/nginx/html/food_tracker
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
