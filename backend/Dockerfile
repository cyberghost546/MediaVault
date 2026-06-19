# =============================================================================
# Dockerfile.backend — PHP 8.2 + Python 3.11 container
# =============================================================================
# This container runs both the PHP server AND the Python scripts.
# WHY both in one container? Simplicity for development. In production you
# might separate them, but for a junior dev project one container is cleaner.
# =============================================================================

# Start from the official PHP 8.2 CLI image (Alpine version for small size).
FROM php:8.2-cli-alpine

# Set working directory inside the container.
WORKDIR /var/www/backend


# ── INSTALL SYSTEM DEPENDENCIES ──
# "apk add --no-cache" installs packages from Alpine's package manager.
# "--no-cache" skips the local package index cache (keeps image size small).
RUN apk add --no-cache \
    # Python 3 and pip (for yt-dlp and other Python packages)
    python3 \
    py3-pip \
    # Build tools needed to compile some Python packages
    python3-dev \
    gcc \
    musl-dev \
    # MariaDB/MySQL client library (needed to compile PHP's pdo_mysql extension)
    mariadb-client \
    mariadb-dev \
    # curl for downloading Composer
    curl \
    # git (for Composer packages that install from GitHub)
    git


# ── INSTALL PHP EXTENSIONS ──
# "docker-php-ext-install" is a helper script in the official PHP images
# that compiles and installs PHP extensions.
# pdo = PHP Data Objects (database abstraction), pdo_mysql = MySQL driver
RUN docker-php-ext-install pdo pdo_mysql


# ── INSTALL COMPOSER ──
# Composer is PHP's package manager (like npm for Node.js).
# We download it from the official site.
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer


# ── INSTALL PYTHON PACKAGES ──
# Copy requirements.txt first (for layer caching — same principle as npm).
COPY python/requirements.txt /tmp/requirements.txt

# Install Python packages.
# "--break-system-packages" is needed on newer Python/pip versions that protect system packages.
RUN pip3 install --no-cache-dir --break-system-packages -r /tmp/requirements.txt


# ── INSTALL PHP PACKAGES ──
# Copy composer.json first.
COPY composer.json composer.lock* ./

# Run composer install inside the container.
RUN composer install --no-dev --no-interaction --optimize-autoloader


# ── COPY APPLICATION CODE ──
# Copy the rest of the backend source code.
COPY . .


# Create storage directories that the PHP/Python code writes to.
RUN mkdir -p storage/downloads storage/progress && chmod -R 777 storage


# Expose the port the PHP built-in server listens on.
EXPOSE 8000


# Start the PHP built-in server.
# "-S 0.0.0.0:8000" means listen on all network interfaces on port 8000.
# "0.0.0.0" is needed (not "localhost") so requests from outside the container reach it.
# "public/index.php" is the entry point for all requests.
CMD ["php", "-S", "0.0.0.0:8000", "public/index.php"]
