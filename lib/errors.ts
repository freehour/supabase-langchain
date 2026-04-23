import { TracedError } from '@freehour/supabase-core';


export interface FileNotSupportedErrorOptions extends ErrorOptions {

    /**
     * The name of the file that caused the error.
     */
    fileName?: string;

    /**
     * The type of the file that is not supported.
     */
    fileType?: string;
}

/**
 * An error that indicates that a file is not supported, e.g. due to its MIME type or extension.
 */
export class FileNotSupportedError extends TracedError {

    /**
     * The name of the file that caused the error.
     */
    readonly fileName?: string;

    /**
     * The type of the file that is not supported.
     */
    readonly fileType?: string;

    constructor(
        message: string,
        {
            fileName,
            fileType,
            ...options
        }: FileNotSupportedErrorOptions = {},
    ) {
        super(message, options);
        this.fileName = fileName;
        this.fileType = fileType;
    }
}
