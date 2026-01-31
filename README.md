# VATSIM Flight Scheduler

**Live Site:** https://vatsim-selector.netlify.app

A web application that helps virtual pilots on the VATSIM network find Virtual SWA routes with ATC coverage across all positions.

## ✨ Features

- **1,219 Routes**: Browse Virtual SWA routes from 109 airports
- **Advanced Filtering**: Filter by departure/arrival airports and specific ATC positions
- **Granular ATC Level Selection**: Choose specific positions (Center, Approach, Tower, Ground, Delivery)
- **Real-Time Controller Data**: Live updates every 30 seconds from VATSIM API
- **Detailed Controller Information**: View callsigns, frequencies, and online time
- **Departure Grouping**: Routes organized by departure airport for easy browsing
- **Dark Mode**: Modern dark theme optimized for readability
- **Responsive Design**: Distinct mobile (card) and desktop (table) layouts
- **Filter-First UX**: Start with filters to find exactly what you need

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
src/
├── lib/
│   ├── components/        # Svelte components
│   ├── data/             # Airport and route JSON data
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript interfaces
├── routes/               # SvelteKit pages
└── tests/                # Unit and E2E tests
```

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

## 🛠️ Tech Stack

- **Framework**: SvelteKit 5 with runes
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest + Playwright
- **Data**: Client-side JSON (no backend required)

## 🎮 About VATSIM

VATSIM (Virtual Air Traffic Simulation Network) is a volunteer-run network providing realistic air traffic control for flight simulation enthusiasts. Since not all ATC positions are staffed at all times, this tool helps virtual pilots find routes where controllers are active.

**Note**: This application is not affiliated with VATSIM, Southwest Airlines, or any official aviation authority. It is a community tool for flight simulation enthusiasts. It is not to be used for any form of real world flight planning or otherwise.

## 🧪 Testing

```bash
npm test              # Unit tests (watch mode)
npm run test:run      # Unit tests (single run)
npm run test:e2e      # E2E tests with Playwright
npm run check         # TypeScript validation
```

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Component architecture and design patterns
- **[PRD.md](PRD.md)** - Product requirements and features
- **[TESTING.md](TESTING.md)** - Testing strategy and guidelines

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome! For development guidelines, see the documentation above.

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## ⚖️ Disclaimer

While the author (GeekTrainer) is a GitHub employee, this project was created independently during personal time and is not affiliated with, endorsed by, or supported by GitHub, Inc. This is a personal open-source project built for the flight simulation community.
