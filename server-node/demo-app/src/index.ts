#!/usr/bin/env node

/**
 * Finatic Server SDK Node.js demo
 *
 * Flow: API key → session → getPortalUrl → grant → listAccounts → webhook catalog.
 */

import 'dotenv/config';
import { FinaticServer } from '@finatic/server-node';
import inquirer from 'inquirer';

const API_URL = process.env.FINATIC_API_URL || 'https://api.finatic.dev';
const API_KEY = process.env.FINATIC_API_KEY!;
const FINATIC_ENVIRONMENT = process.env.FINATIC_ENVIRONMENT || 'sandbox';

async function waitForPortalAuthentication(portalUrl: string): Promise<boolean> {
  console.log('\nVisit this Connect URL, grant an account, then return:');
  console.log(portalUrl);
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Have you completed Connect and granted an account?',
      default: false,
    },
  ]);

  if (!confirmed) {
    console.log('Connect not completed. Exiting...');
    return false;
  }

  return true;
}

async function main() {
  const finatic = new FinaticServer(API_KEY, {
    baseUrl: API_URL,
    apiEnvironment: FINATIC_ENVIRONMENT as 'live' | 'sandbox',
    logLevel: 'debug',
    structuredLogging: true,
  });

  const session = await finatic.v1.startSession();
  if (!session.session_id) {
    throw new Error(session.error ?? 'Session start failed');
  }

  const sessionId = finatic.v1.getSessionId();
  const companyId = finatic.v1.getCompanyId();
  if (!sessionId || !companyId) {
    throw new Error('Session initialization did not return session and company context.');
  }

  console.log('v1 context', {
    sessionId,
    companyAccountId: companyId,
    environment: FINATIC_ENVIRONMENT,
  });

  const portalUrl = await finatic.v1.getPortalUrl({ mode: 'dark' });
  if (!portalUrl) {
    console.log('getPortalUrl did not return a URL');
    return;
  }

  if (!(await waitForPortalAuthentication(portalUrl))) {
    return;
  }

  const accountsResponse = await finatic.v1.listAccounts(
    { includeSyncStatus: true },
    { environment: FINATIC_ENVIRONMENT as 'live' | 'sandbox' },
  );
  console.log('accounts', JSON.stringify(accountsResponse, null, 2));

  const accounts = accountsResponse.data ?? [];
  const firstAccount = Array.isArray(accounts) ? accounts[0] : undefined;
  const accountId = firstAccount?.accountId || firstAccount?.id;
  if (accountId) {
    const accountResponse = await finatic.v1.getAccount(String(accountId), {
      environment: FINATIC_ENVIRONMENT as 'live' | 'sandbox',
    });
    console.log('first account', JSON.stringify(accountResponse, null, 2));
  }

  const webhookCatalog = await finatic.v1.getWebhookCatalog({
    environment: FINATIC_ENVIRONMENT as 'live' | 'sandbox',
  });
  console.log('webhook catalog', JSON.stringify(webhookCatalog, null, 2));
}

main().catch(console.error);
