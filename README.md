This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Setup

Create a `.env` file:

```bash
NEO4J_URI=neo4j+s://<instance>.databases.neo4j.io   # or bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=...
# NEO4J_DATABASE=neo4j    # optional, defaults to the user's home database

# Signs the login session cookie. 32+ characters: openssl rand -base64 32
SESSION_SECRET=...
```

Sign-up creates `(:User {userId, name, email, passwordHash})` nodes, so the
database must be writable: your own instance with the recommendations dataset
loaded, not the read-only demo.neo4jlabs.com server. A unique-email constraint
and a `userId` index are created automatically on the first sign-up.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
