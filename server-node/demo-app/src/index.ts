#!/usr/bin/env node

/**
 * Finatic Server SDK Node.js Usage Example
 *
 * This file demonstrates the FDX v1 account-first flow:
 * session -> portal link -> account read -> webhook subscription catalog.
 */

import 'dotenv/config';
import { FinaticServer } from '@finatic/server-node';
import inquirer from 'inquirer';

// Configuration from environment variables
const API_URL = process.env.FINATIC_API_URL || 'https://api.finatic.dev';
const API_KEY = process.env.FINATIC_API_KEY!;
const FINATIC_ENVIRONMENT = process.env.FINATIC_ENVIRONMENT || 'sandbox';
const CONNECT_URL = (process.env.FINATIC_CONNECT_URL || 'https://connect.finatic.dev').replace(/\/$/, '');

function getPortalUrl(portalLink: unknown): string | null {
  const data =
    (portalLink as any)?.success?.data ??
    (portalLink as any)?.data ??
    {};
  const portalUrl = data.portalUrl || data.portal_url;
  if (portalUrl) return portalUrl;

  const token = data.one_time_token;
  if (!token) return null;

  const url = new URL('/auth', CONNECT_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

async function waitForPortalAuthentication(portalUrl: string): Promise<boolean> {
  console.log('\n🌐 Please visit this URL to authenticate:');
  console.log(portalUrl);
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Have you completed authentication in the portal?',
      default: false,
    },
  ]);

  if (!confirmed) {
    console.log('Authentication not completed. Exiting...');
    return false;
  }

  return true;
}

async function main() {
  const finatic = await FinaticServer.init(API_KEY, undefined, {
    baseUrl: API_URL,
    apiEnvironment: FINATIC_ENVIRONMENT,
    logLevel: 'debug',
    structuredLogging: true,
  });

  const sessionId = finatic.v1.getSessionId();
  const companyId = finatic.v1.getCompanyId();
  if (!sessionId || !companyId) {
    throw new Error('Session initialization did not return session and company context.');
  }

  console.log('FDX v1 context');
  console.log({ sessionId, companyAccountId: companyId, environment: FINATIC_ENVIRONMENT });

  const portalLink = await finatic.v1.createPortalLink(
    sessionId,
    {
      redirectUrl: process.env.FINATIC_PORTAL_REDIRECT_URL,
      metadata: {
        demo: 'server-node/demo-app',
      },
    },
    { environment: FINATIC_ENVIRONMENT as any }
  );
  const portalUrl = getPortalUrl(portalLink);

  if (!portalUrl) {
    console.log('Portal link response did not include a URL:', portalLink);
    return;
  }

  if (!(await waitForPortalAuthentication(portalUrl))) {
    return;
  }

  const accountsResponse = await finatic.v1.listAccounts(
    { includeSyncStatus: true },
    { environment: FINATIC_ENVIRONMENT as any }
  );
  console.log('accounts', JSON.stringify(accountsResponse, null, 2));

  const accounts = (accountsResponse as any)?.success?.data ?? (accountsResponse as any)?.data ?? [];
  const firstAccount = Array.isArray(accounts) ? accounts[0] : undefined;
  const accountId = firstAccount?.accountId || firstAccount?.id;
  if (accountId) {
    const accountResponse = await finatic.v1.getAccount(accountId, {
      environment: FINATIC_ENVIRONMENT as any,
    });
    console.log('first account', JSON.stringify(accountResponse, null, 2));
  }

  const webhookCatalog = await finatic.v1.getWebhookCatalog({
    environment: FINATIC_ENVIRONMENT as any,
  });
  console.log('webhook catalog', JSON.stringify(webhookCatalog, null, 2));
}

main().catch(console.error);
