export function normalizeAddress(address?: string): string | null {
    return address ? address.toLowerCase() : null;
}