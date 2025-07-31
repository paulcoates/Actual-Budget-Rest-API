# Actual Budget Webhook API

A robust, TypeScript-based webhook receiver for [Actual Budget](https://actualbudget.org/) with UpBank integration support.

## Features

- 🔧 **TypeScript** - Full type safety and modern development experience
- 🛡️ **Security** - Helmet, CORS, and input validation
- 📊 **Monitoring** - Structured logging with Winston
- 🧪 **Testing** - Comprehensive test suite with Jest
- 🔄 **CI/CD** - Automated testing and Docker builds
- 🏦 **UpBank Integration** - Process UpBank webhooks automatically
- 📈 **Health Checks** - Built-in health monitoring endpoints
- 🐳 **Docker** - Production-ready containerization

## Quick Start

### Using Docker (Recommended)

```yaml
version: "3"
services:
  actual-rest-api:
    image: ghcr.io/paulcoates/actual-budget-rest-api:latest
    restart: always
    container_name: actual-rest-api
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=https://actual.yourdomain.com
      - SERVER_PASSWORD=your-actual-password
      - BUDGET_ID=your-budget-sync-id
      # Optional: UpBank integration
      - UPBANK_TOKEN=your-upbank-api-token
      - DEFAULT_ACCOUNT_ID=your-default-account-id
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/healthcheck"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/paulcoates/Actual-Budget-Rest-API.git
   cd Actual-Budget-Rest-API
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Actual Budget configuration
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `BUDGET_ID` | Your Actual Budget Sync ID (Settings → Advanced → Sync ID) |
| `SERVER_URL` | URL to your Actual Budget server |
| `SERVER_PASSWORD` | Password for your Actual Budget server |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment mode | `production` |
| `UPBANK_TOKEN` | UpBank API token for webhook integration | - |
| `DEFAULT_ACCOUNT_ID` | Default account for UpBank transactions | - |

## API Endpoints

### Health Check
```http
GET /api/healthcheck
```

### Manual Transaction Creation
```http
POST /api/transaction
Content-Type: application/json

{
  "account_id": "account-uuid",
  "transaction_date": "2024-01-01T00:00:00.000Z",
  "amount": 1000,
  "payee": "Coffee Shop",
  "notes": "Morning coffee",
  "imported_id": "unique-transaction-id"
}
```

### Get Accounts
```http
GET /api/accounts
```

### UpBank Webhook (if configured)
```http
POST /api/webhook/upbank
Content-Type: application/json
X-Up-Authenticity-Signature: webhook-signature

{
  "data": {
    "type": "webhook-events",
    "attributes": {
      "eventType": "TRANSACTION_CREATED"
    }
  }
}
```

## Development

### Available Scripts

```bash
npm run build          # Build TypeScript to JavaScript
npm run start          # Start production server
npm run dev            # Start development server with hot reload
npm run test           # Run test suite
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues automatically
npm run type-check     # Run TypeScript type checking
```

### Project Structure

```
src/
├── __tests__/          # Test files
├── middleware/         # Express middleware
├── routes/            # API route handlers
├── services/          # Business logic services
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
└── index.ts           # Application entry point
```

## Testing

The project includes comprehensive tests covering:

- Unit tests for utilities and services
- Integration tests for API endpoints
- Input validation tests
- Error handling tests

Run tests with coverage:
```bash
npm run test:coverage
```

## UpBank Integration

To enable automatic processing of UpBank transactions:

1. Set up UpBank API access and get your API token
2. Configure the webhook URL in your UpBank developer console
3. Set environment variables:
   ```
   UPBANK_TOKEN=your-api-token
   DEFAULT_ACCOUNT_ID=your-actual-account-id
   ```

The service will automatically:
- Receive UpBank webhook notifications
- Fetch transaction details from UpBank API
- Create corresponding transactions in Actual Budget
- Prevent duplicates using transaction IDs

## Security Considerations

- Always use HTTPS in production
- Keep your API tokens and passwords secure
- Regularly update dependencies
- Monitor logs for suspicious activity
- Use webhook signature verification (implement as needed)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure all tests pass and linting is clean
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
--data '{
    "account_id": "9cdea6e3-4770-4b3b-8d32-XXXXXX",
    "transaction_date": "2024-04-09",
    "amount": -4499,
    "payee": "Temu",
    "notes": "",
    "transaction_id": "29eb97e0-1d23-4440-8b89-XXXXXX"
}'
```
