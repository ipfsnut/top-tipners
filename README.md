# Top Tipners - Community Leaderboard

A modern React application showcasing the top 1000 $TIPN stakers on Base mainnet.

## 🚀 Features

- **Real-time leaderboard** of top TIPN stakers
- **Advanced search** functionality by wallet address
- **Responsive design** optimized for all devices
- **Base mainnet integration** with Viem and Wagmi
- **Modern TypeScript** React architecture
- **Community project** - not affiliated with official TIPNEARN team

## 🛠 Tech Stack

- **React 18.3.1** with TypeScript
- **Vite 5.2.11** for fast development and building
- **Tailwind CSS 3.4.0** for styling
- **TanStack React Query 5.45.1** for data fetching
- **Viem 2.30.5** for blockchain interaction
- **Wagmi 2.15.4** for Web3 connectivity
- **Lucide React 0.263.1** for icons

## 🏗 Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/top-tipners.git
   cd top-tipners
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── Leaderboard.tsx  # Main leaderboard component
│   ├── Header.tsx       # App header
│   ├── SearchBar.tsx    # Search functionality
│   ├── StatsGrid.tsx    # Statistics display
│   ├── LeaderboardRow.tsx # Individual row component
│   ├── Pagination.tsx   # Pagination controls
│   ├── LoadingSpinner.tsx # Loading state
│   ├── ErrorState.tsx   # Error handling
│   └── Footer.tsx       # App footer
├── hooks/
│   └── useTopStakers.ts # Data fetching hook
├── utils/
│   └── format.ts        # Formatting utilities
├── config/
│   └── blockchain.ts    # Blockchain configuration
├── types/
│   └── index.ts         # TypeScript definitions
├── App.tsx              # Main app component
├── main.tsx             # App entry point
└── index.css            # Global styles
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run Biome linter
- `npm run type-check` - Check TypeScript types

## 🌐 Deployment

### Netlify (Recommended)

1. **Connect GitHub repository** to Netlify
2. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Deploy automatically** on pushes to main branch

### Manual Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting provider

## 🔗 Blockchain Integration

### Current Status
- Using **mock data** for development
- Ready for **Base mainnet** integration
- **Viem client** configured for Base network

### Adding Real Contract Data

1. **Update contract addresses** in `src/config/blockchain.ts`:
   ```typescript
   export const TIPN_CONFIG = {
     contractAddress: '0xYourTIPNContractAddress',
     stakingAddress: '0xYourStakingContractAddress',
     decimals: 18,
   }
   ```

2. **Add contract ABI** and update `useTopStakers` hook in `src/hooks/useTopStakers.ts`

3. **Replace mock data** with actual contract calls

## 🎨 Customization

### Styling
- **Tailwind config**: `tailwind.config.js`
- **Custom CSS**: `src/index.css`
- **Theme colors**: Defined in Tailwind config under `tipn` namespace

### Configuration
- **Blockchain settings**: `src/config/blockchain.ts`
- **App constants**: Various component files
- **Type definitions**: `src/types/index.ts`

## 🤝 Contributing

This is a community project! Contributions are welcome:

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

## 📄 License

MIT License - see `LICENSE` file for details.

## ⚠️ Disclaimer

This is an **unofficial community project** and is not affiliated with the TIPNEARN team. Use at your own risk.

## 🔗 Links

- **Live Demo**: [https://top-tipners.netlify.app](https://top-tipners.netlify.app)
- **Base Network**: [https://base.org](https://base.org)
- **GitHub**: [https://github.com/your-username/top-tipners](https://github.com/your-username/top-tipners)

---

Built with ❤️ by the community for the community.Row