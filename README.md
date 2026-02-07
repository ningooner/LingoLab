# LingoLab

A gamified English language learning platform for ESL/EFL teachers to create and run interactive, game-based activities with students.

## Tech Stack

- **Frontend**: Next.js 15+ (App Router, TypeScript)
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ and npm
- A Supabase account ([sign up free](https://supabase.com))
- Git

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd lingolabdraft
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Create a new project in [Supabase Dashboard](https://app.supabase.com)

3. Get your project credentials:
   - Go to Project Settings > API
   - Copy the `Project URL` and `anon/public` key

4. Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
lingolabdraft/
├── app/              # Next.js App Router pages and layouts
├── components/       # Reusable React components
├── lib/              # Utility functions and configurations
│   └── supabase/    # Supabase client setup
├── types/           # TypeScript type definitions
├── public/          # Static assets
└── styles/          # Global styles and CSS modules
```

## Development Workflow

- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Start Production**: `npm start`
- **Lint**: `npm run lint`

## Supabase Setup

The project includes pre-configured Supabase client utilities:

- `lib/supabase/client.ts` - Browser client for client-side operations
- `lib/supabase/server.ts` - Server client for Server Components and Route Handlers
- `lib/supabase/middleware.ts` - Session refresh middleware
- `middleware.ts` - Next.js middleware for authentication

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy!

## Contributing

This is an open-source project. Contributions are welcome!

## License

TBD
