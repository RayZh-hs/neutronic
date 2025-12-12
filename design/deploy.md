# Deployment Guide

This document outlines the steps to build and deploy the Neutronic application.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)

## Frontend

The frontend is a Vue.js application built with Vite.

### Configuration

The frontend uses environment variables for configuration. You can set these in a `.env` file in the `frontend` directory or as system environment variables during the build process.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `API_SERVER_URL` | The full URL of the backend API (e.g., `https://api.neutronic.com/api`) | `http://localhost:9721/api` |

### Build Steps

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Build the application:
   ```bash
   yarn run build
   ```

   To specify the server URL during build:
   ```bash
   VITE_SERVER_URL=https://your-api-url.com/api yarn run build
   ```

4. The build artifacts will be generated in the `frontend/dist` directory. These files can be served by any static file server (Nginx, Apache, etc.).

## Backend

The backend is a Node.js Express application.

### Configuration

The backend uses environment variables for configuration.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the server listens on | `9721` |

### Setup Steps

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

### Running the Server

To start the server:

```bash
node api/server.cjs
```

To run on a specific port:

```bash
PORT=8080 node api/server.cjs
```

## Production Deployment Example

1. **Backend**:
   - Deploy the `backend` folder to your server.
   - Run `yarn install --production`.
   - Use a process manager like PM2 to keep the server running:
     ```bash
     pm2 start api/server.cjs --name "neutronic-api"
     ```

2. **Frontend**:
   - Build the frontend locally or in a CI/CD pipeline with the correct `VITE_SERVER_URL`.
   - Upload the contents of `frontend/dist` to your web server's public directory.
   - Configure your web server (e.g., Nginx) to serve `index.html` for all non-asset routes (SPA fallback).

## GitHub Pages Deployment

This repository is configured to automatically deploy the frontend to GitHub Pages using GitHub Actions.

### Workflow

The workflow is defined in `.github/workflows/deploy.yml`. It triggers on pushes to `dev` and `main` branches.

1.  Installs dependencies using `yarn`.
2.  Builds the frontend with `VITE_SERVER_URL` set to `https://service.norb.space/neutronic/api`.
3.  Uploads the build artifact (`frontend/dist`) using `actions/upload-pages-artifact`.
4.  Deploys the artifact to GitHub Pages using `actions/deploy-pages`.

### Setup

1.  Go to the repository settings on GitHub.
2.  Navigate to **Pages**.
3.  Under **Build and deployment**, select **GitHub Actions** as the source.
4.  No further configuration is needed for the branch/folder as the workflow handles it.
