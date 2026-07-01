# Hermes

Hermes v1.3 is an AI-assisted market intelligence and paper trading platform
with local browser persistence.
It is built with Next.js App Router, TypeScript, Tailwind CSS, and
component-based UI.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Scope

- Uses public no-key CoinGecko market data for BTC/USD, ETH/USD, SOL/USD, and LINK/USD.
- Uses TradingView lightweight-charts for the candlestick chart.
- Uses rule-based mock AI analysis only; no OpenAI API is connected yet.
- Includes a paper portfolio, manual trade controls, open positions, trade history, performance stats, equity curve, and Hermes Coach reviews.
- Saves paper account state, positions, history, journal entries, and settings to localStorage.
- Does not connect to Coinbase, store API keys, place real trades, or automate trading.
- Designed as a professional, beginner-friendly paper trading dashboard.
