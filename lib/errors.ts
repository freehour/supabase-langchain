import type { StorageLocation } from '@freehour/supabase-core';
import { TracedError } from '@freehour/supabase-core';


export interface FileNotSupportedErrorOptions extends ErrorOptions {

    /**
     * The file that caused the error.
     */
    file: File;
}

/**
 * An error that indicates that a file is not supported, e.g. due to its MIME type or extension.
 */
export class FileNotSupportedError extends TracedError {

    /**
     * The file that caused the error.
     */
    readonly file: File;

    constructor(
        message: string,
        {
            file,
            ...options
        }: FileNotSupportedErrorOptions,
    ) {
        super(message, options);
        this.file = file;
    }
}

export interface EmbeddingErrorOptions extends ErrorOptions {

    /**
     * The location of the file that caused the error.
     */
    location: StorageLocation;
}

/**
 * An error that indicates that an embedding operation failed, e.g. due to a failure in the embedding model or vector store.
 */
export class EmbeddingError extends TracedError {

    /**
     * The location of the file that caused the error.
     */
    readonly location: StorageLocation;

    constructor(
        message: string,
        {
            location,
            ...options
        }: EmbeddingErrorOptions,
    ) {
        super(message, options);
        this.location = location;
    }
}
