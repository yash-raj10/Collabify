# Collabify Client

A Next.js-based real-time collaboration platform supporting document editing and drawing with ExcaliDraw.

## Features

- **Real-time document collaboration** with live cursor tracking
- **Collaborative whiteboarding** with ExcaliDraw integration
- **User authentication** with JWT tokens
- **WebSocket-based real-time sync**
- **Production-ready environment configuration**

## Environment Setup

1. Copy the environment example file:

   ```bash
   cp .env.example .env.local
   ```

2. Update the environment variables in `.env.local`:

   ```bash
   # For local development
   NEXT_PUBLIC_API_URL=http://localhost:8080
   NEXT_PUBLIC_WS_URL=ws://localhost:8080

   # For production, use your actual domain
   # NEXT_PUBLIC_API_URL=https://your-api-domain.com
   # NEXT_PUBLIC_WS_URL=wss://your-api-domain.com
   ```

## Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment instructions including Docker, Vercel, and other deployment options.

## API Integration

The client automatically uses environment variables for API endpoints:

- REST API calls use `NEXT_PUBLIC_API_URL`
- WebSocket connections use `NEXT_PUBLIC_WS_URL`

This makes it easy to deploy to different environments without code changes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
