/**
 * Input validation utilities for enterprise-grade data safety.
 */

export const MAX_FILE_SIZE_MB = 5;
export const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000; // ~5MB base64

/**
 * Validates file size. Returns error message or null if valid.
 */
export function validateFileSize(file: File, maxMB: number = MAX_FILE_SIZE_MB): string | null {
    if (file.size > maxMB * 1024 * 1024) {
        return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: ${maxMB}MB`;
    }
    return null;
}

/**
 * Sanitizes text input: trims whitespace and enforces max length.
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
    return input.trim().slice(0, maxLength);
}

/**
 * Validates that a string is a non-empty, meaningful input.
 */
export function isNonEmpty(value: string | null | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}
