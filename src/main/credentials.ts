// keytar wraps macOS Keychain and Windows Credential Manager
import keytar from 'keytar';

const SERVICE = 'strataflux';
const ADO_ACCOUNT = 'ado-pat';
const GITHUB_ACCOUNT = 'github-pat';

export async function getAdoPat(): Promise<string | null> {
  return keytar.getPassword(SERVICE, ADO_ACCOUNT);
}

export async function getGithubPat(): Promise<string | null> {
  return keytar.getPassword(SERVICE, GITHUB_ACCOUNT);
}

export async function setAdoPat(token: string): Promise<void> {
  await keytar.setPassword(SERVICE, ADO_ACCOUNT, token);
}

export async function setGithubPat(token: string): Promise<void> {
  await keytar.setPassword(SERVICE, GITHUB_ACCOUNT, token);
}

export async function hasCredentials(): Promise<{ ado: boolean; github: boolean }> {
  const [ado, github] = await Promise.all([
    keytar.getPassword(SERVICE, ADO_ACCOUNT),
    keytar.getPassword(SERVICE, GITHUB_ACCOUNT),
  ]);
  return { ado: ado !== null, github: github !== null };
}
