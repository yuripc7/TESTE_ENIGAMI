/**
 * Safe FileReader utilities - replaces all unsafe `reader.result as string` casts.
 * Provides proper error handling, abort detection, and type validation.
 */

export function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('FileReader result is not a string'));
            }
        };
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.onabort = () => reject(new Error('FileReader aborted'));
        reader.readAsDataURL(file);
    });
}

export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('FileReader result is not a string'));
            }
        };
        reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
        reader.onabort = () => reject(new Error('FileReader aborted'));
        reader.readAsText(file);
    });
}
