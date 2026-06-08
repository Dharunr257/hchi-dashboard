FROM nginx:alpine

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy static assets to default Nginx folder
COPY index.html style.css app.js /usr/share/nginx/html/

# Copy custom Nginx configuration for route handling & gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose Nginx container port
EXPOSE 80
