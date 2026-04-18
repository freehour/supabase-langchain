import type { JsonObject, StorageLocation } from '@freehour/supabase-core';
import type { DocumentInterface } from '@langchain/core/documents';


export interface FileMetadata {
    name: string;
    size: number;
    type: string;
}

export type MetadataGeneratorFn<
    BucketName extends string = string,
    Metadata extends JsonObject = JsonObject,
> = (location: StorageLocation<BucketName>) => Metadata;

export type StorageDocument<
    BucketName extends string = string,
    Metadata extends JsonObject = JsonObject,
> = DocumentInterface<StorageLocation<BucketName> & FileMetadata & Metadata>;
