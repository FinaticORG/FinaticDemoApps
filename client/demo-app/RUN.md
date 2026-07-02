# How to Run the Client Demo App

## Quick Start

1. **Navigate to the directory**:

   ```bash
   cd client/demo-app
   ```

2. **Install dependencies**:

   ```bash
   yarn install
   ```

3. **Create `.env` file**:

   ```bash
   printf "VITE_FINATIC_API_KEY=your_api_key_here\nVITE_FINATIC_ENVIRONMENT=sandbox\nVITE_FINATIC_API_URL=https://api-staging.finatic.dev\nVITE_FINATIC_CONNECT_URL=https://connect.finatic.dev\n" > .env
   ```

   Or manually create `.env` with:

   ```
   VITE_FINATIC_API_KEY=your_api_key_here
   VITE_FINATIC_ENVIRONMENT=sandbox
   VITE_FINATIC_API_URL=https://api-staging.finatic.dev
   VITE_FINATIC_CONNECT_URL=https://connect.finatic.dev
   ```

4. **Run the app**:

   ```bash
   yarn dev
   ```

5. **Open in browser**:
   - Go to `http://localhost:5174`
   - The app will automatically initialize the SDK
   - Click "Open Authentication Portal" to create a v1 portal link and complete Connect
   - Once authenticated, click "List Accounts" to read financial accounts
   - Click "Get First Account" to fetch one account by account id

## Available Scripts

- `yarn dev` - Start development server (port 5174)
- `yarn build` - Build for production
- `yarn preview` - Preview production build
- `yarn lint` - Run ESLint

## Troubleshooting

### Port already in use?

If port 5174 is already in use, you can change it in `vite.config.ts`:

```typescript
server: {
  port: 5175, // or any other port
}
```

### API Key not working?

- Make sure your `.env` file is in the `demo-app` directory
- Restart the dev server after creating/modifying `.env`
- Check that `VITE_FINATIC_API_KEY` is set correctly

### SDK not found?

- Make sure you ran `yarn install`
- The app uses the local branch-ready `@finatic/client` checkout configured in `package.json`
- If the package cannot be resolved, make sure the sibling `FinaticClientSDK` checkout exists and is on the recorded v1 branch ref
