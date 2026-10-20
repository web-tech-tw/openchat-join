FROM mcr.microsoft.com/devcontainers/base:ubuntu
ARG MONGO_TOOLS_VERSION=8.0

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Install MongoDB shell
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y gnupg curl \
    && curl -sSL "https://www.mongodb.org/static/pgp/server-${MONGO_TOOLS_VERSION}.asc" | gpg --dearmor > /usr/share/keyrings/mongodb-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/${MONGO_TOOLS_VERSION} multiverse" | tee /etc/apt/sources.list.d/mongodb-org-${MONGO_TOOLS_VERSION}.list \
    && apt-get update && apt-get install -y mongodb-mongosh \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

ENV PATH="/home/vscode/.bun/bin:${PATH}"
