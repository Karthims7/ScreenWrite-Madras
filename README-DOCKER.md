# Docker Setup for Screenwriting App

This guide explains how to run the screenwriting application using Docker and Docker Compose.

## Prerequisites

- Docker installed on your system
- Docker Compose installed

## Quick Start

1. **Clone the repository and switch to the dockerize branch:**
   ```bash
   git checkout feature/dockerize-app
   ```

2. **Build and start the application:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3001
   - API Health Check: http://localhost:3001/api/health

## Docker Commands

### Using Docker Compose (Recommended)

```bash
# Build the application
docker-compose build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop the application
docker-compose down

# Restart the application
docker-compose restart app

# Remove containers and volumes (WARNING: deletes database)
docker-compose down -v
```

### Using npm scripts

```bash
# Build Docker image
npm run docker:build

# Start containers
npm run docker:up

# View logs
npm run docker:logs

# Stop containers
npm run docker:down

# Restart containers
npm run docker:restart
```

## Architecture

The application runs in a single container with:

- **Frontend**: React app built with Vite, served as static files
- **Backend**: Express.js API server with TypeScript
- **Database**: SQLite database stored in a persistent Docker volume

### Container Structure

```
screenwriting-app (Container)
├── dist/           # Built React frontend
├── dist-server/    # Compiled TypeScript backend
├── data/           # SQLite database (mounted volume)
└── node_modules/   # Production dependencies
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Available variables:
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (production/development)

### Database

- SQLite database is automatically created in `./data/screenplays.db`
- Data persists between container restarts via Docker volume mounting
- Database is initialized with sample screenplay data on first run

## Development vs Production

### Development Mode (Local)
```bash
npm run dev  # Runs both frontend and backend with hot reload
```

### Production Mode (Docker)
```bash
docker-compose up --build  # Optimized production build
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Change port in docker-compose.yml or stop other services
   docker-compose down
   ```

2. **Database issues:**
   ```bash
   # Reset database (WARNING: deletes all data)
   docker-compose down -v
   docker-compose up --build
   ```

3. **Build failures:**
   ```bash
   # Clear Docker cache
   docker system prune -a
   docker-compose build --no-cache
   ```

### Logs and Debugging

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs app

# Follow logs in real-time
docker-compose logs -f app

# Access container shell
docker-compose exec app sh
```

## API Endpoints

- `GET /api/screenplays` - List all screenplays
- `GET /api/screenplays/:id` - Get specific screenplay
- `POST /api/screenplays` - Create new screenplay
- `PUT /api/screenplays/:id` - Update screenplay
- `DELETE /api/screenplays/:id` - Delete screenplay
- `GET /api/health` - Health check

## File Structure

```
.
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore          # Files to exclude from Docker build
├── .env.example           # Environment variables template
├── server/                # Backend source code
├── src/                   # Frontend source code
├── dist/                  # Built frontend (created during build)
├── dist-server/           # Compiled backend (created during build)
└── data/                  # SQLite database (mounted volume)
```

## Security Features

- Non-root user execution
- Minimal Alpine Linux base image
- Security headers via Helmet.js
- CORS configuration
- Input validation

## Performance

- Multi-stage Docker build for smaller images
- Optimized production dependencies
- Health checks for container monitoring
- Static file serving with proper caching headers

## Deployment

For production deployment:

1. Update environment variables in `docker-compose.yml`
2. Configure proper domain and SSL certificates
3. Set up monitoring and logging
4. Configure backup strategy for SQLite database
5. Consider using a reverse proxy (nginx) for additional features

## Backup and Restore

### Database Backup

```bash
# Copy database file from container
docker cp $(docker-compose ps -q app):/app/data/screenplays.db ./backup.db
```

### Database Restore

```bash
# Copy backup into running container
docker cp ./backup.db $(docker-compose ps -q app):/app/data/screenplays.db
docker-compose restart app
```

## Contributing

When making changes to the Docker setup:

1. Test builds locally: `docker-compose build`
2. Update documentation if needed
3. Ensure all npm scripts work correctly
4. Test database persistence across container restarts