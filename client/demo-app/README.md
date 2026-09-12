# Finatic Client SDK Demo

A React demo application that demonstrates the Finatic Client SDK v1 account-first flow. This is a minimal browser example aligned with the server SDK demo apps, but with a UI.

## Features

- **Clean Architecture**: SDK logic separated from UI (`src/sdk.ts` vs `src/App.tsx`)
- **Singleton Pattern**: Single SDK instance managed in `sdk.ts`
- **Simple API**: Easy-to-understand functions for all SDK operations
- **Authentication**: Mint `POST /api/v1/session/init`, then `FinaticConnect.init` + `openPortal`
- **Data Display**: List financial accounts and fetch an account by account id
- **Environment Toggle**: Use sandbox or live by setting `VITE_FINATIC_ENVIRONMENT`

## Project Structure

```
src/
├── sdk.ts          # All SDK logic - initialization, authentication, data fetching
├── App.tsx         # UI only - displays data and handles user interactions
├── App.css         # Styling
└── main.tsx        # Entry point
```

## Setup

1. **Navigate to the directory**:

```bash
cd client/demo-app
```

2. **Install dependencies**:

```bash
yarn install
```

This installs the local branch-ready `@finatic/client` checkout plus React, Vite, and other dev dependencies.

3. **Create a `.env` file** in the `demo-app` directory:

```bash
FINATIC_API_KEY=your_api_key_here
VITE_FINATIC_ENVIRONMENT=sandbox
VITE_FINATIC_API_URL=https://api-staging.finatic.dev
```

`FINATIC_API_KEY` is read by the loopback-only Vite **dev server**. It is never exposed as `VITE_*`, so it does not ship in the browser bundle. The browser calls the same-origin `POST /api/finatic/token` route.

## Running

```bash
yarn dev
```

The app will start and be available at **`http://localhost:5174`**

## Usage

1. The app automatically initializes the SDK on load (see `src/sdk.ts`)
2. Click "Open Authentication Portal" to create a v1 portal link and complete Connect
3. Once authenticated, click "List Accounts" to read account data
4. Click "Get First Account" to fetch one financial account by account id
5. Data will be displayed in cards below

## How to Use the SDK

### Understanding the Code

**`src/sdk.ts`** - This is where all SDK logic lives:
- `initializeSDK()` - Initializes the SDK singleton
- `isAuthenticated()` - Check auth status
- `getUserId()` - Get current user ID
- `openPortal()` - Create a v1 portal link and open Connect
- `listAccounts()` and `getAccount(accountId)` - Fetch account-first v1 data

**`src/App.tsx`** - This is pure UI:
- Displays authentication status
- Shows data in cards
- Handles button clicks
- All SDK calls go through functions from `sdk.ts`

### Example: Using the SDK in Your Code

```typescript
import { initializeSDK, listAccounts, isAuthenticated } from './sdk';

// Initialize once (creates singleton)
await initializeSDK();

// Check auth
if (isAuthenticated()) {
  // Fetch data
  const accounts = await listAccounts();
  console.log('Accounts:', accounts);
}
```

### Key Concepts

1. **Singleton Pattern**: The SDK instance is created once and reused
2. **Separation of Concerns**: SDK logic is separate from UI
3. **Simple API**: Each SDK operation has a simple function
4. **Error Handling**: Functions throw errors that you can catch

## Architecture

This app demonstrates best practices:

- ✅ **SDK Logic Separated**: All SDK code in `sdk.ts`
- ✅ **UI Separated**: All UI code in `App.tsx`
- ✅ **Singleton Pattern**: One SDK instance for the entire app
- ✅ **Simple Functions**: Easy-to-use API for SDK operations
- ✅ **Minimal Dependencies**: Just React and the client SDK
