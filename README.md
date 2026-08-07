# Cricket Auction Panel (Phase-1)

A public-facing portal for viewing ongoing cricket auctions, registering as a player, and viewing the list of approved players. Built with React (Vite), Supabase, and Cloudinary.

## Features
- **Dark Cricket Theme**: Custom-built pure CSS stadium/neon-green theme.
- **Player Registration**: Multi-step form with Cloudinary image upload for photo and Aadhar card.
- **Dynamic Auction Loading**: Automatically fetches the single active auction (`status = 'registration_open' or 'running'`).
- **Player List & Filters**: View all approved players for the active auction with real-time filtering (Role, Batting Style, Bowling Style, City).
- **Responsive Design**: Fully functional on mobile and desktop through pure CSS flex and grid layouts.

## Tech Stack
- Frontend: React (Vite), React Router (HashRouter for GitHub Pages)
- Backend/DB: Supabase
- Storage: Cloudinary (unsigned upload preset)
- Styling: Vanilla CSS

## Setup Instructions

### 1. Supabase Setup
1. Create a new project on [Supabase](https://supabase.com/).
2. Run the following SQL to create the tables:
   ```sql
   CREATE TABLE auctions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     auction_name TEXT NOT NULL,
     auction_code TEXT UNIQUE NOT NULL,
     auction_logo TEXT,
     auction_date DATE,
     venue TEXT,
     status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'registration_open', 'running', 'completed'))
   );

   CREATE TABLE players (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     player_code TEXT UNIQUE,
     first_name TEXT NOT NULL,
     last_name TEXT NOT NULL,
     mobile TEXT UNIQUE NOT NULL,
     email TEXT NOT NULL,
     dob DATE,
     city TEXT,
     state TEXT,
     area TEXT,
     gender TEXT,
     photo_url TEXT,
     aadhar_card_url TEXT,
     player_role TEXT,
     batting_style TEXT,
     bowling_style TEXT,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE TABLE auction_players (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     auction_id UUID REFERENCES auctions(id),
     player_id UUID REFERENCES players(id),
     approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
     UNIQUE(auction_id, player_id)
   );
   ```
3. Get your Supabase Project URL and Anon Key from Settings -> API.

### 2. Cloudinary Setup
1. Create a free account on [Cloudinary](https://cloudinary.com/).
2. Go to Settings -> Upload -> Add Upload Preset.
3. Set the "Signing Mode" to **Unsigned**.
4. Note down your Cloud Name (from Dashboard) and the Upload Preset name you just created.

### 3. Local Development
1. Clone this repository or download the source code.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in your keys:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### 4. GitHub Pages Deployment
Since the project uses `HashRouter`, it is fully compatible with GitHub Pages.
1. Update `vite.config.js` to include your repository base path if not deploying to user root (e.g. `base: '/repo-name/'`).
2. Build the project:
   ```bash
   npm run build
   ```
3. Push the contents of the `dist` folder to your GitHub `gh-pages` branch, or use a GitHub Action for automatic Vite deployment.
